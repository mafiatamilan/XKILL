import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BattlesService, BATTLE_MATCHMAKING_QUEUE } from './battles.service';
import { BattleRepository } from './battles.repository';
import { RankedQueue } from './ranked-queue';
import { DsaGateway } from '../dsa/dsa.gateway';
import { DsaService } from '../dsa/dsa.service';
import { RankingService } from '../dsa/ranking.service';

describe('BattlesService', () => {
  let service: BattlesService;
  let repository: {
    createBattle: jest.Mock;
    findBattleById: jest.Mock;
    findBattleByInviteCode: jest.Mock;
    updateBattle: jest.Mock;
    addParticipant: jest.Mock;
    findParticipant: jest.Mock;
    updateParticipantScore: jest.Mock;
    findParticipants: jest.Mock;
    setParticipantResult: jest.Mock;
    countActiveProblems: jest.Mock;
    findRandomProblem: jest.Mock;
    getCodingRating: jest.Mock;
    upsertCodingRating: jest.Mock;
    createRatingHistory: jest.Mock;
    findRatingHistory: jest.Mock;
    findDueRankedBattles: jest.Mock;
    claimBattleFinalization: jest.Mock;
    findBattleSubmissions: jest.Mock;
    findBattlesForUser: jest.Mock;
    countBattlesForUser: jest.Mock;
  };
  let queue: {
    join: jest.Mock;
    leave: jest.Mock;
    isQueued: jest.Mock;
    snapshot: jest.Mock;
    claim: jest.Mock;
    count: jest.Mock;
  };
  let ranking: { upsert: jest.Mock; rankOf: jest.Mock };
  let gateway: { emitVerdict: jest.Mock; emitToUser: jest.Mock };
  let dsa: { submitCode: jest.Mock };
  let submissionQueue: { add: jest.Mock };

  beforeEach(async () => {
    repository = {
      createBattle: jest.fn(),
      findBattleById: jest.fn(),
      findBattleByInviteCode: jest.fn(),
      updateBattle: jest.fn(),
      addParticipant: jest.fn(),
      findParticipant: jest.fn(),
      updateParticipantScore: jest.fn(),
      findParticipants: jest.fn(),
      setParticipantResult: jest.fn(),
      countActiveProblems: jest.fn(),
      findRandomProblem: jest.fn(),
      getCodingRating: jest.fn(),
      upsertCodingRating: jest.fn(),
      createRatingHistory: jest.fn(),
      findRatingHistory: jest.fn(),
      findDueRankedBattles: jest.fn(),
      claimBattleFinalization: jest.fn(),
      findBattleSubmissions: jest.fn(),
      findBattlesForUser: jest.fn(),
      countBattlesForUser: jest.fn(),
    };
    queue = {
      join: jest.fn(),
      leave: jest.fn(),
      isQueued: jest.fn(),
      snapshot: jest.fn(),
      claim: jest.fn(),
      count: jest.fn(),
    };
    ranking = { upsert: jest.fn(), rankOf: jest.fn() };
    gateway = { emitVerdict: jest.fn(), emitToUser: jest.fn() };
    dsa = { submitCode: jest.fn() };
    submissionQueue = { add: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        BattlesService,
        { provide: BattleRepository, useValue: repository },
        { provide: RankedQueue, useValue: queue },
        { provide: RankingService, useValue: ranking },
        { provide: DsaGateway, useValue: gateway },
        { provide: DsaService, useValue: dsa },
        { provide: getQueueToken(BATTLE_MATCHMAKING_QUEUE), useValue: submissionQueue },
      ],
    }).compile();

    service = module.get(BattlesService);
  });

  describe('joinQueue', () => {
    it('adds user to queue when not already queued', async () => {
      queue.isQueued.mockResolvedValue(false);
      queue.snapshot.mockResolvedValue([]);
      repository.getCodingRating.mockResolvedValue(null);
      const result = await service.joinQueue('u1');
      expect(result.queued).toBe(true);
      expect(result.alreadyQueued).toBe(false);
      expect(queue.join).toHaveBeenCalledWith('u1', 1200);
    });

    it('returns alreadyQueued if user is in queue', async () => {
      queue.isQueued.mockResolvedValue(true);
      const result = await service.joinQueue('u1');
      expect(result.alreadyQueued).toBe(true);
      expect(queue.join).not.toHaveBeenCalled();
    });
  });

  describe('leaveQueue', () => {
    it('removes user from queue', async () => {
      queue.leave.mockResolvedValue(true);
      const result = await service.leaveQueue('u1');
      expect(result.left).toBe(true);
      expect(result.wasQueued).toBe(true);
    });
  });

  describe('createPracticeBattle', () => {
    it('creates a solo practice battle', async () => {
      repository.getCodingRating.mockResolvedValue(null);
      repository.findRandomProblem.mockResolvedValue({
        id: 'p1',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
      });
      repository.createBattle.mockResolvedValue({
        id: 'b1',
        type: 'practice',
        status: 'active',
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
        durationSeconds: 900,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 900_000),
        finishedAt: null,
        winnerId: null,
        inviteCode: null,
        participants: [
          {
            userId: 'u1',
            score: 0,
            rank: null,
            solvedAt: null,
            user: { id: 'u1', fullName: 'Alice' },
          },
        ],
      });
      const result = await service.createPracticeBattle('u1', {});
      expect(result.type).toBe('practice');
      expect(repository.createBattle).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'practice' }),
      );
    });
  });

  describe('createPrivateBattle', () => {
    it('creates a private battle with an invite code', async () => {
      repository.findRandomProblem.mockResolvedValue({
        id: 'p1',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
      });
      repository.findBattleByInviteCode.mockResolvedValue(null);
      repository.createBattle.mockResolvedValue({
        id: 'b1',
        type: 'private',
        status: 'pending',
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
        durationSeconds: 900,
        inviteCode: 'ABC123',
        participants: [{ userId: 'u1' }],
      });
      const result = await service.createPrivateBattle('u1', {});
      expect(result.inviteCode).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('joinPrivateBattle', () => {
    it('joins a pending private battle and activates it', async () => {
      const now = new Date();
      repository.findBattleByInviteCode.mockResolvedValue({
        id: 'b1',
        type: 'private',
        status: 'pending',
        durationSeconds: 900,
        participants: [{ userId: 'u1' }],
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
      });
      repository.getCodingRating.mockResolvedValue(null);
      repository.addParticipant.mockResolvedValue({
        userId: 'u2',
        ratingBefore: 1200,
        user: { id: 'u2', fullName: 'Bob' },
      });
      repository.updateBattle.mockResolvedValue({});
      repository.findBattleById.mockResolvedValue({
        id: 'b1',
        type: 'private',
        status: 'active',
        durationSeconds: 900,
        startedAt: now,
        endsAt: new Date(now.getTime() + 900_000),
        finishedAt: null,
        winnerId: null,
        inviteCode: 'ABC123',
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
        participants: [
          {
            userId: 'u1',
            score: 0,
            rank: null,
            solvedAt: null,
            user: { id: 'u1', fullName: 'Alice' },
          },
          {
            userId: 'u2',
            score: 0,
            rank: null,
            solvedAt: null,
            user: { id: 'u2', fullName: 'Bob' },
          },
        ],
      });
      const result = await service.joinPrivateBattle('u2', { inviteCode: 'ABC123' });
      expect(result.status).toBe('active');
      expect(repository.updateBattle).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ status: 'active' }),
      );
      expect(gateway.emitToUser).toHaveBeenCalledTimes(2);
    });

    it('throws for invalid invite code', async () => {
      repository.findBattleByInviteCode.mockResolvedValue(null);
      await expect(service.joinPrivateBattle('u2', { inviteCode: 'INVALID' })).rejects.toThrow(
        'Invalid invite code',
      );
    });

    it('throws if battle is no longer pending', async () => {
      repository.findBattleByInviteCode.mockResolvedValue({
        id: 'b1',
        status: 'active',
        participants: [{ userId: 'u1' }],
        durationSeconds: 900,
      });
      await expect(service.joinPrivateBattle('u2', { inviteCode: 'ABC123' })).rejects.toThrow(
        'no longer accepting',
      );
    });
  });

  describe('runMatchmakingTick', () => {
    it('pairs two close-rated players and creates a battle', async () => {
      const now = new Date();
      queue.snapshot.mockResolvedValue([
        { userId: 'u1', rating: 1200, joinedAt: now },
        { userId: 'u2', rating: 1210, joinedAt: now },
      ]);
      queue.claim.mockResolvedValue(true);
      repository.findRandomProblem.mockResolvedValue({
        id: 'p1',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
      });
      repository.createBattle.mockResolvedValue({
        id: 'b1',
        type: 'ranked',
        status: 'active',
        durationSeconds: 900,
        startedAt: now,
        endsAt: new Date(now.getTime() + 900_000),
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
        participants: [
          { userId: 'u1', user: { id: 'u1', fullName: 'Alice' } },
          { userId: 'u2', user: { id: 'u2', fullName: 'Bob' } },
        ],
      });

      await service.runMatchmakingTick();
      expect(queue.claim).toHaveBeenCalledWith('u1', 'u2');
      expect(repository.createBattle).toHaveBeenCalled();
      expect(gateway.emitToUser).toHaveBeenCalledTimes(2);
    });

    it('does not create a battle when no players in queue', async () => {
      queue.snapshot.mockResolvedValue([]);
      await service.runMatchmakingTick();
      expect(queue.claim).not.toHaveBeenCalled();
    });

    it('does not create a battle when claim fails (concurrent tick)', async () => {
      const now = new Date();
      queue.snapshot.mockResolvedValue([
        { userId: 'u1', rating: 1200, joinedAt: now },
        { userId: 'u2', rating: 1210, joinedAt: now },
      ]);
      queue.claim.mockResolvedValue(false);
      await service.runMatchmakingTick();
      expect(repository.createBattle).not.toHaveBeenCalled();
    });
  });

  describe('getBattle', () => {
    it('returns battle details', async () => {
      repository.findBattleById.mockResolvedValue({
        id: 'b1',
        type: 'ranked',
        status: 'active',
        durationSeconds: 900,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 900_000),
        finishedAt: null,
        winnerId: null,
        inviteCode: null,
        problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
        participants: [
          {
            userId: 'u1',
            score: 0,
            rank: null,
            solvedAt: null,
            user: { id: 'u1', fullName: 'Alice' },
          },
        ],
      });
      const result = await service.getBattle('b1');
      expect(result.id).toBe('b1');
    });

    it('throws 404 for unknown battle', async () => {
      repository.findBattleById.mockResolvedValue(null);
      await expect(service.getBattle('bad')).rejects.toThrow('Battle not found');
    });
  });

  describe('getMyRating', () => {
    it('returns initial rating for new users', async () => {
      repository.findDueRankedBattles.mockResolvedValue([]);
      repository.getCodingRating.mockResolvedValue(null);
      ranking.rankOf.mockResolvedValue(null);
      const result = await service.getMyRating('u1');
      expect(result.rating).toBe(1200);
      expect(result.tier).toBe('Amateur');
      expect(result.provisional).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('returns paginated match history', async () => {
      repository.findBattlesForUser.mockResolvedValue([]);
      repository.countBattlesForUser.mockResolvedValue(0);
      const result = await service.getHistory('u1');
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
    });
  });
});
