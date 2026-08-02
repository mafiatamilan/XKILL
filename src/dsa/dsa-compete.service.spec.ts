import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DsaCompeteRepository } from './dsa-compete.repository';
import { DsaCompeteService } from './dsa-compete.service';
import { RankingService } from './ranking.service';
import { COMPOSITE_SECONDS_BASE } from './competition/rating-calculator';

const now = Date.now();
const aroundNow = (offsetMs: number) => new Date(now + offsetMs);
const past = (secondsAgo: number) => aroundNow(-secondsAgo * 1000);
const at = (iso: string) => new Date(iso);
const contest = (overrides: Record<string, unknown> = {}) => ({
  id: 'contest-1',
  slug: 'weekly-1',
  title: 'Weekly 1',
  description: null,
  status: 'published',
  startTime: past(3600),
  endTime: aroundNow(3600_000),
  isRated: true,
  rules: null,
  createdBy: 'faculty-1',
  standingsFinalizedAt: null,
  problems: [],
  ...overrides,
});

describe('DsaCompeteService', () => {
  let service: DsaCompeteService;
  let repository: Record<string, jest.Mock>;
  let ranking: Record<string, jest.Mock>;

  beforeEach(async () => {
    repository = {
      findContestBySlug: jest.fn(),
      createContest: jest.fn(),
      listContests: jest.fn(),
      countContests: jest.fn(),
      findContestById: jest.fn(),
      updateContest: jest.fn(),
      replaceContestProblems: jest.fn(),
      deleteContest: jest.fn(),
      findParticipant: jest.fn(),
      createParticipant: jest.fn(),
      upsertParticipant: jest.fn(),
      findContestProblem: jest.fn(),
      findSolve: jest.fn(),
      upsertSolveAttempt: jest.fn(),
      findSolvesForParticipant: jest.fn(),
      updateParticipantScore: jest.fn(),
      findParticipantsForStandings: jest.fn(),
      findDueRatedContests: jest.fn(),
      claimStandings: jest.fn(),
      setParticipantRating: jest.fn(),
      getCodingRating: jest.fn(),
      upsertCodingRating: jest.fn(),
      createRatingHistory: jest.fn(),
      findRatingHistory: jest.fn(),
      createAntiCheatEvent: jest.fn(),
    };
    ranking = {
      upsert: jest.fn(),
      remove: jest.fn(),
      reset: jest.fn(),
      slice: jest.fn(),
      rankOf: jest.fn(),
      scoreOf: jest.fn(),
      count: jest.fn(),
      top: jest.fn(),
      around: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DsaCompeteService,
        { provide: DsaCompeteRepository, useValue: repository },
        { provide: RankingService, useValue: ranking },
      ],
    }).compile();

    service = module.get(DsaCompeteService);
  });

  describe('createContest', () => {
    it('creates a contest with its problems', async () => {
      repository.findContestBySlug.mockResolvedValue(null);
      repository.createContest.mockResolvedValue(
        contest({ problems: [{ id: 'cp1', order: 0, basePoints: 100, problem: { id: 'p1' } }] }),
      );
      const result = await service.createContest('faculty-1', {
        slug: 'weekly-1',
        title: 'Weekly 1',
        startTime: '2026-08-01T00:00:00Z',
        endTime: '2026-08-01T02:00:00Z',
        isRated: true,
        problems: [{ problemId: 'p1' }],
      });
      expect(repository.createContest).toHaveBeenCalledWith(
        expect.objectContaining({ problems: [{ problemId: 'p1' }] }),
      );
      expect(result.title).toBe('Weekly 1');
    });

    it('rejects a duplicate slug', async () => {
      repository.findContestBySlug.mockResolvedValue(contest());
      await expect(
        service.createContest('f1', {
          slug: 'weekly-1',
          title: 'x',
          startTime: '2026-08-01T00:00:00Z',
          endTime: '2026-08-01T02:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an endTime before startTime', async () => {
      repository.findContestBySlug.mockResolvedValue(null);
      await expect(
        service.createContest('f1', {
          slug: 'weekly-1',
          title: 'x',
          startTime: '2026-08-01T02:00:00Z',
          endTime: '2026-08-01T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registerContest', () => {
    it('registers a new participant', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipant.mockResolvedValue(null);
      repository.createParticipant.mockResolvedValue({ id: 'p1' });
      const result = await service.registerContest('u1', 'contest-1');
      expect(result).toEqual({
        contestId: 'contest-1',
        registered: true,
        alreadyRegistered: false,
      });
      expect(repository.createParticipant).toHaveBeenCalledWith('contest-1', 'u1');
    });

    it('is idempotent for an already-registered participant', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipant.mockResolvedValue({ id: 'p1' });
      const result = await service.registerContest('u1', 'contest-1');
      expect(result.alreadyRegistered).toBe(true);
      expect(repository.createParticipant).not.toHaveBeenCalled();
    });

    it('rejects registration for a draft contest', async () => {
      repository.findContestById.mockResolvedValue(contest({ status: 'draft' }));
      await expect(service.registerContest('u1', 'contest-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects registration after the contest ends', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ endTime: at('2020-01-01T00:00:00Z') }),
      );
      await expect(service.registerContest('u1', 'contest-1')).rejects.toThrow(BadRequestException);
    });

    it('throws 404 for a missing contest', async () => {
      repository.findContestById.mockResolvedValue(null);
      await expect(service.registerContest('u1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertSubmittable', () => {
    it('allows a registered student to submit an in-contest problem', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipant.mockResolvedValue({ id: 'p1' });
      repository.findContestProblem.mockResolvedValue({ id: 'cp1' });
      await expect(service.assertSubmittable('u1', 'contest-1', 'p1')).resolves.toBeUndefined();
    });

    it('blocks submissions before the contest starts', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ startTime: at('2099-01-01T00:00:00Z'), endTime: at('2099-01-01T02:00:00Z') }),
      );
      await expect(service.assertSubmittable('u1', 'contest-1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks submissions after the contest ends', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ startTime: at('2020-01-01T00:00:00Z'), endTime: at('2020-01-01T02:00:00Z') }),
      );
      await expect(service.assertSubmittable('u1', 'contest-1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks unregistered users with a 403', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipant.mockResolvedValue(null);
      await expect(service.assertSubmittable('u1', 'contest-1', 'p1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks problems that are not part of the contest', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipant.mockResolvedValue({ id: 'p1' });
      repository.findContestProblem.mockResolvedValue(null);
      await expect(service.assertSubmittable('u1', 'contest-1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('onSubmissionGraded', () => {
    it('does nothing for a non-contest submission', async () => {
      await service.onSubmissionGraded({
        id: 's1',
        userId: 'u1',
        contestId: null,
        problemId: 'p1',
        verdict: 'accepted',
        completedAt: new Date(),
      });
      expect(repository.findContestById).not.toHaveBeenCalled();
    });

    it('excludes submissions whose verdict lands after the contest ends', async () => {
      repository.findContestById.mockResolvedValue(contest({ endTime: past(5) }));
      await service.onSubmissionGraded({
        id: 's1',
        userId: 'u1',
        contestId: 'contest-1',
        problemId: 'p1',
        verdict: 'accepted',
        completedAt: past(1),
      });
      expect(repository.upsertParticipant).not.toHaveBeenCalled();
      expect(ranking.upsert).not.toHaveBeenCalled();
    });

    it('scores an accepted in-window submission and updates the live board', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.upsertParticipant.mockResolvedValue({ id: 'part-1' });
      repository.findContestProblem.mockResolvedValue({ id: 'cp1', basePoints: 100 });
      repository.findSolve.mockResolvedValue(null);
      repository.upsertSolveAttempt.mockResolvedValue({});
      const solvedAt = past(1800);
      repository.findSolvesForParticipant.mockResolvedValue([
        {
          maxPointsEarned: 100,
          firstAcceptedAt: solvedAt,
          contestProblem: { order: 0, basePoints: 100 },
        },
      ]);
      repository.updateParticipantScore.mockResolvedValue({});

      await service.onSubmissionGraded({
        id: 's1',
        userId: 'u1',
        contestId: 'contest-1',
        problemId: 'p1',
        verdict: 'accepted',
        completedAt: solvedAt,
      });

      expect(repository.upsertSolveAttempt).toHaveBeenCalledWith('part-1', 'cp1', 1, {
        firstAcceptedAt: solvedAt,
        maxPointsEarned: 100,
      });
      expect(repository.updateParticipantScore).toHaveBeenCalledWith('part-1', 100, 1800);
      expect(ranking.upsert).toHaveBeenCalledWith(
        'dsa:contest:contest-1:leaderboard',
        'u1',
        expect.any(Number),
      );
    });

    it('counts attempts without awarding points twice', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.upsertParticipant.mockResolvedValue({ id: 'part-1' });
      repository.findContestProblem.mockResolvedValue({ id: 'cp1', basePoints: 100 });
      repository.findSolve.mockResolvedValue({
        id: 'solve-1',
        attemptCount: 1,
        firstAcceptedAt: past(3000),
      });
      repository.upsertSolveAttempt.mockResolvedValue({});
      repository.findSolvesForParticipant.mockResolvedValue([
        {
          maxPointsEarned: 100,
          firstAcceptedAt: past(3000),
          contestProblem: { order: 0, basePoints: 100 },
        },
      ]);
      repository.updateParticipantScore.mockResolvedValue({});

      await service.onSubmissionGraded({
        id: 's2',
        userId: 'u1',
        contestId: 'contest-1',
        problemId: 'p1',
        verdict: 'accepted',
        completedAt: past(1200),
      });

      expect(repository.upsertSolveAttempt).toHaveBeenCalledWith('part-1', 'cp1', 2, {});
      expect(ranking.upsert).toHaveBeenCalledWith(
        'dsa:contest:contest-1:leaderboard',
        'u1',
        expect.any(Number),
      );
    });
  });

  describe('getLeaderboard', () => {
    it('returns a 404 for an unknown contest', async () => {
      repository.findContestById.mockResolvedValue(null);
      await expect(service.getLeaderboard('nope')).rejects.toThrow(NotFoundException);
    });

    it('syncs from persisted solves and returns the live board', async () => {
      repository.findContestById.mockResolvedValue(contest());
      repository.findParticipantsForStandings.mockResolvedValue([
        {
          userId: 'u1',
          user: { fullName: 'Alice' },
          solvedProblems: [{ maxPointsEarned: 200, firstAcceptedAt: at('2026-08-01T00:30:00Z') }],
        },
        {
          userId: 'u2',
          user: { fullName: 'Bob' },
          solvedProblems: [{ maxPointsEarned: 100, firstAcceptedAt: at('2026-08-01T00:10:00Z') }],
        },
      ]);
      ranking.slice.mockResolvedValue([
        {
          member: 'u1',
          score: 200 * COMPOSITE_SECONDS_BASE + (COMPOSITE_SECONDS_BASE - 1 - 1800),
          rank: 0,
        },
        {
          member: 'u2',
          score: 100 * COMPOSITE_SECONDS_BASE + (COMPOSITE_SECONDS_BASE - 1 - 600),
          rank: 1,
        },
      ]);

      const result = await service.getLeaderboard('contest-1', 10, 0);
      expect(ranking.upsert).toHaveBeenCalledTimes(2); // sync re-upserts persisted state
      expect(result.data[0]).toMatchObject({
        rank: 1,
        userId: 'u1',
        fullName: 'Alice',
        score: 200,
        penaltySeconds: 1800,
      });
      expect(result.data[1]).toMatchObject({
        rank: 2,
        userId: 'u2',
        score: 100,
        penaltySeconds: 600,
      });
      expect(result.total).toBe(2);
    });
  });

  describe('rating', () => {
    it('reports a default rating for a fresh user', async () => {
      repository.findDueRatedContests.mockResolvedValue([]);
      repository.getCodingRating.mockResolvedValue(null);
      ranking.rankOf.mockResolvedValue(null);
      const result = await service.getMyRating('u1');
      expect(result).toMatchObject({
        rating: 1200,
        tier: 'Amateur',
        globalRank: null,
        provisional: true,
      });
    });

    it('reports the stored rating and global rank', async () => {
      repository.findDueRatedContests.mockResolvedValue([]);
      repository.getCodingRating.mockResolvedValue({
        rating: 1450,
        bestRating: 1500,
        contestsParticipated: 3,
      });
      ranking.rankOf.mockResolvedValue(1);
      const result = await service.getMyRating('u1');
      expect(result.rating).toBe(1450);
      expect(result.globalRank).toBe(2);
      expect(result.provisional).toBe(true);
    });

    it('lists rating history newest-first', async () => {
      repository.findDueRatedContests.mockResolvedValue([]);
      repository.findRatingHistory.mockResolvedValue([
        {
          contestId: 'c1',
          contestName: 'Weekly 1',
          rank: 1,
          ratingBefore: 1200,
          ratingAfter: 1240,
          delta: 40,
          createdAt: at('2026-08-01T00:00:00Z'),
        },
      ]);
      const result = await service.getRatingHistory('u1');
      expect(result.data[0]).toMatchObject({ contestName: 'Weekly 1', delta: 40 });
    });
  });

  describe('reportAntiCheatEvent', () => {
    it('persists a generic anti-cheat event', async () => {
      repository.createAntiCheatEvent.mockResolvedValue({
        id: 'e1',
        sourceType: 'dsa-contest',
        sourceId: 'c1',
        eventType: 'tab-switch',
      });
      const result = await service.reportAntiCheatEvent('u1', {
        sourceType: 'dsa-contest',
        sourceId: 'c1',
        eventType: 'tab-switch',
      });
      expect(result.logged).toBe(true);
      expect(repository.createAntiCheatEvent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', sourceType: 'dsa-contest' }),
      );
    });
  });

  describe('finalizeStandings', () => {
    it('is a no-op before the contest ends', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ endTime: at('2099-01-01T00:00:00Z') }),
      );
      await service.finalizeStandings('contest-1');
      expect(repository.claimStandings).not.toHaveBeenCalled();
    });

    it('is a no-op for unrated contests', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ isRated: false, endTime: at('2020-01-01T00:00:00Z') }),
      );
      await service.finalizeStandings('contest-1');
      expect(repository.claimStandings).not.toHaveBeenCalled();
    });

    it('skips when another reader already claimed finalization', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ endTime: at('2020-01-01T00:00:00Z') }),
      );
      repository.claimStandings.mockResolvedValue({ count: 0 });
      await service.finalizeStandings('contest-1');
      expect(repository.getCodingRating).not.toHaveBeenCalled();
    });

    it('applies Elo updates, persists history and rebuilds the rating board', async () => {
      repository.findContestById.mockResolvedValue(
        contest({ endTime: at('2020-01-01T00:00:00Z') }),
      );
      repository.claimStandings.mockResolvedValue({ count: 1 });
      repository.findParticipantsForStandings.mockResolvedValue([
        {
          id: 'part-a',
          userId: 'a',
          user: { fullName: 'Alice' },
          solvedProblems: [{ maxPointsEarned: 200, firstAcceptedAt: past(2000) }],
        },
        {
          id: 'part-b',
          userId: 'b',
          user: { fullName: 'Bob' },
          solvedProblems: [{ maxPointsEarned: 200, firstAcceptedAt: past(500) }],
        },
      ]);
      repository.getCodingRating.mockResolvedValue(null); // both fresh at 1200
      repository.upsertCodingRating.mockImplementation(async (userId, rating) => ({
        id: `rating-${userId}`,
        userId,
        rating,
      }));
      repository.createRatingHistory.mockResolvedValue({});
      repository.setParticipantRating.mockResolvedValue({});
      ranking.upsert.mockResolvedValue(undefined);

      await service.finalizeStandings('contest-1');

      // Equal points, so Alice's earlier accept wins rank 1; she gains +20, Bob -20.
      const historyCalls = repository.createRatingHistory.mock.calls;
      const aliceHistory = historyCalls.find(([arg]) => arg.userId === 'a');
      expect(aliceHistory[0]).toMatchObject({
        rank: 1,
        ratingBefore: 1200,
        ratingAfter: 1220,
        delta: 20,
      });
      const bobHistory = historyCalls.find(([arg]) => arg.userId === 'b');
      expect(bobHistory[0]).toMatchObject({
        rank: 2,
        ratingBefore: 1200,
        ratingAfter: 1180,
        delta: -20,
      });
      expect(repository.upsertCodingRating).toHaveBeenCalledWith('a', 1220, 1220, 1);
      // bestRating never drops below the 1200 starting rating
      expect(repository.upsertCodingRating).toHaveBeenCalledWith('b', 1180, 1200, 1);
      expect(ranking.upsert).toHaveBeenCalledWith('dsa:rating:global', 'a', 1220);
      expect(ranking.upsert).toHaveBeenCalledWith('dsa:rating:global', 'b', 1180);
    });
  });
});
