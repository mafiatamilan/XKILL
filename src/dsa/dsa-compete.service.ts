import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import { DsaCompeteRepository } from './dsa-compete.repository';
import { RankingService } from './ranking.service';
import { AntiCheatEventDto, CreateContestDto, UpdateContestDto } from './dto/dsa-compete.dto';
import {
  computeRatingUpdate,
  contestCompositeScore,
  ratingTier,
  INITIAL_RATING,
  COMPOSITE_SECONDS_BASE,
} from './competition/rating-calculator';
import { assignCompetitionRanks, contestMetrics } from './competition/contest-metrics';

const leaderboardKey = (contestId: string) => `dsa:contest:${contestId}:leaderboard`;
const RATING_KEY = 'dsa:rating:global';

const CONTEST_NOT_FOUND = { code: 'CONTEST_NOT_FOUND', message: 'Contest not found' };
const SLUG_TAKEN = { code: 'CONTEST_SLUG_TAKEN', message: 'Contest slug is already in use' };

@Injectable()
export class DsaCompeteService {
  constructor(
    private readonly repository: DsaCompeteRepository,
    private readonly ranking: RankingService,
  ) {}

  // ---- Contest CRUD (faculty / college_admin / admin) ----

  async createContest(userId: string, dto: CreateContestDto) {
    const existing = await this.repository.findContestBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException(SLUG_TAKEN);
    }
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertOrderedTimes(startTime, endTime);
    const contest = await this.repository.createContest({
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      startTime,
      endTime,
      isRated: dto.isRated ?? false,
      rules: dto.rules,
      createdBy: userId,
      problems: dto.problems ?? [],
    });
    return this.mapContestDetail(contest);
  }

  async listContests(page: number, limit: number, status?: string) {
    const [data, total] = await Promise.all([
      this.repository.listContests(page, limit, status),
      this.repository.countContests(status),
    ]);
    return {
      data: data.map((contest) => this.mapContestSummary(contest)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getContest(id: string) {
    const contest = await this.repository.findContestById(id);
    if (!contest) {
      throw new NotFoundException(CONTEST_NOT_FOUND);
    }
    return this.mapContestDetail(contest);
  }

  async updateContest(id: string, dto: UpdateContestDto) {
    await this.ensureContest(id);
    if (dto.startTime && dto.endTime) {
      this.assertOrderedTimes(new Date(dto.startTime), new Date(dto.endTime));
    }
    const contest = await this.repository.updateContest(id, {
      title: dto.title,
      description: dto.description,
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      isRated: dto.isRated,
      rules: dto.rules,
      status: dto.status,
    });
    if (dto.problems) {
      await this.repository.replaceContestProblems(id, dto.problems);
    }
    return this.mapContestDetail((await this.repository.findContestById(id)) ?? contest);
  }

  async deleteContest(id: string) {
    await this.ensureContest(id);
    await this.ranking.reset(leaderboardKey(id));
    await this.repository.deleteContest(id);
    return { id, deleted: true };
  }

  // ---- Registration (students) ----

  async registerContest(userId: string, contestId: string) {
    const contest = await this.repository.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(CONTEST_NOT_FOUND);
    }
    if (contest.status === 'draft' || contest.status === 'cancelled') {
      throw new BadRequestException({
        code: 'CONTEST_NOT_REGISTERABLE',
        message: 'This contest is not open for registration',
      });
    }
    if (new Date() > contest.endTime) {
      throw new BadRequestException({
        code: 'CONTEST_ENDED',
        message: 'This contest has already ended',
      });
    }
    const existing = await this.repository.findParticipant(contestId, userId);
    if (existing) {
      return { contestId, registered: true, alreadyRegistered: true };
    }
    await this.repository.createParticipant(contestId, userId);
    return { contestId, registered: true, alreadyRegistered: false };
  }

  // ---- Submissions (reuse 5.5a pipeline, tagged with contestId) ----

  async assertSubmittable(userId: string, contestId: string, problemId: string) {
    const contest = await this.repository.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(CONTEST_NOT_FOUND);
    }
    if (contest.status === 'draft' || contest.status === 'cancelled') {
      throw new BadRequestException({
        code: 'CONTEST_NOT_SUBMITTABLE',
        message: 'This contest is not accepting submissions',
      });
    }
    const now = new Date();
    if (now < contest.startTime) {
      throw new BadRequestException({
        code: 'CONTEST_NOT_STARTED',
        message: 'The contest has not started yet',
      });
    }
    if (now > contest.endTime) {
      throw new BadRequestException({
        code: 'CONTEST_ENDED',
        message: 'The contest has ended',
      });
    }
    const participant = await this.repository.findParticipant(contestId, userId);
    if (!participant) {
      throw new ForbiddenException({
        code: 'NOT_REGISTERED',
        message: 'Register for the contest before submitting',
      });
    }
    const contestProblem = await this.repository.findContestProblem(contestId, problemId);
    if (!contestProblem) {
      throw new BadRequestException({
        code: 'PROBLEM_NOT_IN_CONTEST',
        message: 'This problem is not part of the contest',
      });
    }
  }

  /**
   * Called by the grading worker after a verdict lands. Applies the contest
   * time boundary: a submission whose grading completes after `endTime` is
   * still graded and the user still gets their verdict, but it is excluded
   * from the contest leaderboard and rating.
   */
  async onSubmissionGraded(submission: {
    id: string;
    userId: string;
    contestId?: string | null;
    problemId: string;
    verdict: string | null;
    completedAt: Date | null;
  }) {
    if (!submission.contestId) {
      return;
    }
    const contest = await this.repository.findContestById(submission.contestId);
    if (!contest) {
      return;
    }
    const completedAt = submission.completedAt ?? new Date();
    if (completedAt < contest.startTime || completedAt > contest.endTime) {
      return; // graded outside the contest window — excluded from standings
    }

    const participant = await this.repository.upsertParticipant(
      submission.contestId,
      submission.userId,
    );
    const contestProblem = await this.repository.findContestProblem(
      submission.contestId,
      submission.problemId,
    );
    if (!contestProblem) {
      return;
    }

    const existing = await this.repository.findSolve(participant.id, contestProblem.id);
    const attemptCount = (existing?.attemptCount ?? 0) + 1;
    const isNewAccept = submission.verdict === 'accepted' && !existing?.firstAcceptedAt;
    const options =
      isNewAccept && submission.completedAt
        ? {
            firstAcceptedAt: submission.completedAt,
            maxPointsEarned: contestProblem.basePoints,
          }
        : {};
    await this.repository.upsertSolveAttempt(
      participant.id,
      contestProblem.id,
      attemptCount,
      options,
    );

    const solves = await this.repository.findSolvesForParticipant(participant.id);
    const { score, penaltySeconds } = contestMetrics(solves, contest.startTime);
    await this.repository.updateParticipantScore(participant.id, score, penaltySeconds);
    await this.ranking.upsert(
      leaderboardKey(submission.contestId),
      submission.userId,
      contestCompositeScore(score, penaltySeconds),
    );
  }

  // ---- Leaderboard ----

  async getLeaderboard(contestId: string, limit = 100, offset = 0) {
    const contest = await this.repository.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(CONTEST_NOT_FOUND);
    }
    if (contest.isRated && new Date() > contest.endTime) {
      await this.finalizeStandings(contestId);
    }
    await this.syncLeaderboard(contestId);

    const entries = await this.ranking.slice(leaderboardKey(contestId), offset, offset + limit - 1);
    const participants = await this.repository.findParticipantsForStandings(contestId);
    const names = new Map(participants.map((p) => [p.userId, p.user.fullName]));
    return {
      contestId,
      data: entries.map((entry) => ({
        rank: entry.rank + 1,
        userId: entry.member,
        fullName: names.get(entry.member) ?? null,
        score: Math.floor(entry.score / COMPOSITE_SECONDS_BASE),
        penaltySeconds: Math.max(
          0,
          COMPOSITE_SECONDS_BASE - 1 - (entry.score % COMPOSITE_SECONDS_BASE),
        ),
      })),
      total: participants.length,
    };
  }

  // ---- Rating ----

  async getMyRating(userId: string) {
    await this.finalizeDueContests();
    const row = await this.repository.getCodingRating(userId);
    const rating = row?.rating ?? INITIAL_RATING;
    const rank = await this.ranking.rankOf(RATING_KEY, userId);
    return {
      rating,
      bestRating: row?.bestRating ?? rating,
      contestsParticipated: row?.contestsParticipated ?? 0,
      tier: ratingTier(rating),
      globalRank: rank === null ? null : rank + 1,
      provisional: (row?.contestsParticipated ?? 0) < 10,
    };
  }

  async getRatingHistory(userId: string) {
    await this.finalizeDueContests();
    const history = await this.repository.findRatingHistory(userId);
    return {
      data: history.map((point) => ({
        contestId: point.contestId,
        contestName: point.contestName,
        rank: point.rank,
        ratingBefore: point.ratingBefore,
        ratingAfter: point.ratingAfter,
        delta: point.delta,
        date: point.createdAt.toISOString(),
      })),
    };
  }

  async getRatingHistoryForAnalytics(userId: string) {
    await this.finalizeDueContests();
    const history = await this.repository.findRatingHistory(userId);
    return history.map((point) => ({
      contestName: point.contestName,
      rank: point.rank,
      ratingBefore: point.ratingBefore,
      ratingAfter: point.ratingAfter,
      date: point.createdAt,
    }));
  }

  // ---- Anti-cheat ----

  async reportAntiCheatEvent(userId: string, dto: AntiCheatEventDto) {
    const event = await this.repository.createAntiCheatEvent({
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      userId,
      eventType: dto.eventType,
      detail: dto.detail as unknown as Prisma.InputJsonValue,
    });
    return {
      id: event.id,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      eventType: event.eventType,
      logged: true,
    };
  }

  // ---- Standings finalization ----

  async finalizeDueContests() {
    const due = await this.repository.findDueRatedContests(new Date());
    for (const contest of due) {
      await this.finalizeStandings(contest.id);
    }
  }

  async finalizeStandings(contestId: string) {
    const contest = await this.repository.findContestById(contestId);
    if (!contest || !contest.isRated) {
      return;
    }
    if (new Date() <= contest.endTime) {
      return; // not finished yet — never pre-apply
    }
    const claimed = await this.repository.claimStandings(contestId, new Date());
    if (claimed.count === 0) {
      return; // another reader already finalized
    }

    const participants = await this.repository.findParticipantsForStandings(contestId);
    const ranked = assignCompetitionRanks(
      participants
        .map((participant) => ({
          participant,
          ...contestMetrics(participant.solvedProblems, contest.startTime),
        }))
        .sort((a, b) => b.score - a.score || a.penaltySeconds - b.penaltySeconds),
    );

    const ratings = new Map<string, { rating: number; bestRating: number; participated: number }>();
    for (const entry of ranked) {
      const row = await this.repository.getCodingRating(entry.participant.userId);
      ratings.set(entry.participant.userId, {
        rating: row?.rating ?? INITIAL_RATING,
        bestRating: row?.bestRating ?? INITIAL_RATING,
        participated: row?.contestsParticipated ?? 0,
      });
    }

    for (const entry of ranked) {
      const current = ratings.get(entry.participant.userId)!.rating;
      const opponentRatings = ranked
        .filter((other) => other.participant.userId !== entry.participant.userId)
        .map((other) => ratings.get(other.participant.userId)!.rating);
      const update = computeRatingUpdate({
        currentRating: current,
        contestsParticipated: ratings.get(entry.participant.userId)!.participated,
        userRank: entry.rank,
        opponentRatings,
      });

      await this.repository.setParticipantRating(
        entry.participant.id,
        entry.rank,
        current,
        update.newRating,
        update.delta,
      );
      const bestRating = Math.max(
        update.newRating,
        ratings.get(entry.participant.userId)!.bestRating,
      );
      const codingRating = await this.repository.upsertCodingRating(
        entry.participant.userId,
        update.newRating,
        bestRating,
        ratings.get(entry.participant.userId)!.participated + 1,
      );
      await this.repository.createRatingHistory({
        codingRatingId: codingRating.id,
        userId: entry.participant.userId,
        contestId,
        contestName: contest.title,
        rank: entry.rank,
        ratingBefore: current,
        ratingAfter: update.newRating,
        delta: update.delta,
      });
      await this.ranking.upsert(RATING_KEY, entry.participant.userId, update.newRating);
    }

    await this.syncLeaderboard(contestId);
  }

  // ---- Helpers ----

  private async syncLeaderboard(contestId: string) {
    const contest = await this.repository.findContestById(contestId);
    if (!contest) {
      return;
    }
    const participants = await this.repository.findParticipantsForStandings(contestId);
    for (const participant of participants) {
      const { score, penaltySeconds } = contestMetrics(
        participant.solvedProblems,
        contest.startTime,
      );
      await this.ranking.upsert(
        leaderboardKey(contestId),
        participant.userId,
        contestCompositeScore(score, penaltySeconds),
      );
    }
  }

  private async ensureContest(id: string) {
    const contest = await this.repository.findContestById(id);
    if (!contest) {
      throw new NotFoundException(CONTEST_NOT_FOUND);
    }
  }

  private assertOrderedTimes(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new BadRequestException({
        code: 'INVALID_CONTEST_WINDOW',
        message: 'endTime must be after startTime',
      });
    }
  }

  private mapContestSummary(contest: {
    id: string;
    slug: string;
    title: string;
    status: string;
    startTime: Date;
    endTime: Date;
    isRated: boolean;
    _count?: { participants: number };
  }) {
    return {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      status: contest.status,
      startTime: contest.startTime.toISOString(),
      endTime: contest.endTime.toISOString(),
      isRated: contest.isRated,
      participantCount: contest._count?.participants ?? 0,
    };
  }

  private mapContestDetail(contest: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: string;
    startTime: Date;
    endTime: Date;
    isRated: boolean;
    rules: string | null;
    createdBy: string;
    standingsFinalizedAt: Date | null;
    problems?: Array<{
      id: string;
      order: number;
      basePoints: number;
      problem?: { id: string; slug: string; title: string; difficulty: string };
    }>;
  }) {
    return {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      description: contest.description,
      status: contest.status,
      startTime: contest.startTime.toISOString(),
      endTime: contest.endTime.toISOString(),
      isRated: contest.isRated,
      rules: contest.rules,
      standingsFinalized: contest.standingsFinalizedAt !== null,
      problems: (contest.problems ?? [])
        .sort((a, b) => a.order - b.order)
        .map((entry) => ({
          id: entry.id,
          order: entry.order,
          basePoints: entry.basePoints,
          problem: entry.problem,
        })),
    };
  }
}
