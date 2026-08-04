import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DsaService } from '../dsa/dsa.service';
import { DsaGateway } from '../dsa/dsa.gateway';
import { RankingService } from '../dsa/ranking.service';
import { BattleRepository } from './battles.repository';
import { RankedQueue } from './ranked-queue';
import { pairPlayers, QueuedPlayer, PairingParams } from './matchmaking/matchmaking';
import {
  computeRatingUpdate,
  INITIAL_RATING,
  ratingTier,
} from '../dsa/competition/rating-calculator';
import {
  CreatePracticeBattleDto,
  CreatePrivateBattleDto,
  JoinPrivateBattleDto,
  SubmitBattleCodeDto,
} from './dto/battle.dto';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';

export const BATTLE_MATCHMAKING_QUEUE = 'battle-matchmaking';
const RATING_KEY = 'dsa:rating:global';
const BASE_DURATION = 900; // 15 minutes
const MATCHMAKING_PARAMS: PairingParams = { baseWindow: 50, growthPerSecond: 10, maxWindow: 400 };

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class BattlesService implements OnModuleInit {
  private readonly logger = new Logger(BattlesService.name);

  constructor(
    private readonly repository: BattleRepository,
    private readonly queue: RankedQueue,
    private readonly ranking: RankingService,
    private readonly gateway: DsaGateway,
    private readonly dsa: DsaService,
    @InjectQueue(BATTLE_MATCHMAKING_QUEUE) private readonly matchmakingQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.matchmakingQueue.add(
      'matchmake',
      {},
      {
        repeat: { every: 5_000 },
        jobId: 'battle-matchmake-tick',
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    this.logger.log('Registered battle matchmaking tick (every 5s)');
  }

  // ---- Matchmaking ----

  async joinQueue(userId: string) {
    const existing = await this.queue.isQueued(userId);
    if (existing) {
      return { queued: true, alreadyQueued: true };
    }

    const rating = await this.getUserRating(userId);
    await this.queue.join(userId, rating);

    // Try to pair immediately for fast matches.
    await this.runMatchmakingTick();

    return { queued: true, alreadyQueued: false, rating };
  }

  async leaveQueue(userId: string) {
    const removed = await this.queue.leave(userId);
    return { left: true, wasQueued: removed };
  }

  /**
   * Core matchmaking tick: snapshot queue, pair players, claim pairs atomically,
   * create battles. Called by the BullMQ repeatable job AND by joinQueue.
   */
  async runMatchmakingTick(): Promise<void> {
    const snapshot = await this.queue.snapshot();
    if (snapshot.length < 2) return;

    const players: QueuedPlayer[] = snapshot.map((s) => ({
      userId: s.userId,
      rating: s.rating,
      joinedAt: s.joinedAt,
    }));

    const pairs = pairPlayers(players, new Date(), MATCHMAKING_PARAMS);

    for (const pair of pairs) {
      const claimed = await this.queue.claim(pair.a.userId, pair.b.userId);
      if (!claimed) continue; // another tick took them

      await this.createRankedBattle(pair.a, pair.b);
    }
  }

  private async createRankedBattle(a: QueuedPlayer, b: QueuedPlayer) {
    const problem = await this.repository.findRandomProblem();
    if (!problem) {
      this.logger.error('No active problems available for battle matchmaking');
      return;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + BASE_DURATION * 1000);

    const battle = await this.repository.createBattle({
      type: 'ranked',
      status: 'active',
      problemId: problem.id,
      durationSeconds: BASE_DURATION,
      startedAt: now,
      endsAt,
      participants: [
        { userId: a.userId, rating: a.rating },
        { userId: b.userId, rating: b.rating },
      ],
    });

    this.logger.log(`Created ranked battle ${battle.id} for ${a.userId} vs ${b.userId}`);

    // Notify both participants via their user rooms.
    for (const p of battle.participants) {
      this.gateway.emitToUser(p.userId, 'battle.start', {
        battleId: battle.id,
        type: 'ranked',
        problem: battle.problem,
        durationSeconds: battle.durationSeconds,
        endsAt: battle.endsAt?.toISOString(),
        opponents: battle.participants
          .filter((op) => op.userId !== p.userId)
          .map((op) => ({ userId: op.userId, fullName: op.user.fullName })),
      });
    }
  }

  // ---- Practice / Private ----

  async createPracticeBattle(userId: string, dto: CreatePracticeBattleDto) {
    const rating = await this.getUserRating(userId);
    const problem = await this.repository.findRandomProblem();
    if (!problem) {
      throw new BadRequestException({
        code: 'NO_PROBLEMS',
        message: 'No active problems available',
      });
    }

    const durationSeconds = dto.durationSeconds ?? BASE_DURATION;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationSeconds * 1000);

    const battle = await this.repository.createBattle({
      type: 'practice',
      status: 'active',
      problemId: problem.id,
      durationSeconds,
      startedAt: now,
      endsAt,
      createdById: userId,
      participants: [{ userId, rating }],
    });

    return this.mapBattleSummary(battle);
  }

  async createPrivateBattle(userId: string, dto: CreatePrivateBattleDto) {
    const problem = await this.repository.findRandomProblem();
    if (!problem) {
      throw new BadRequestException({
        code: 'NO_PROBLEMS',
        message: 'No active problems available',
      });
    }

    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.repository.findBattleByInviteCode(inviteCode);
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const durationSeconds = dto.durationSeconds ?? BASE_DURATION;

    const battle = await this.repository.createBattle({
      type: 'private',
      status: 'pending',
      problemId: problem.id,
      durationSeconds,
      inviteCode,
      createdById: userId,
      participants: [{ userId }],
    });

    return {
      battleId: battle.id,
      inviteCode,
      status: 'pending',
      problem: battle.problem,
      durationSeconds,
    };
  }

  async joinPrivateBattle(userId: string, dto: JoinPrivateBattleDto) {
    const battle = await this.repository.findBattleByInviteCode(dto.inviteCode);
    if (!battle) {
      throw new NotFoundException({ code: 'BATTLE_NOT_FOUND', message: 'Invalid invite code' });
    }
    if (battle.status !== 'pending') {
      throw new BadRequestException({
        code: 'BATTLE_NOT_JOINABLE',
        message: 'Battle is no longer accepting players',
      });
    }
    if (battle.participants.length >= 2) {
      throw new BadRequestException({
        code: 'BATTLE_FULL',
        message: 'Battle already has 2 players',
      });
    }
    if (battle.participants.some((p) => p.userId === userId)) {
      throw new BadRequestException({
        code: 'ALREADY_JOINED',
        message: 'You are already in this battle',
      });
    }

    const rating = await this.getUserRating(userId);
    await this.repository.addParticipant(battle.id, userId, rating);

    const now = new Date();
    const endsAt = new Date(now.getTime() + battle.durationSeconds * 1000);

    await this.repository.updateBattle(battle.id, {
      status: 'active',
      startedAt: now,
      endsAt,
    });

    const fullBattle = await this.repository.findBattleById(battle.id);

    for (const p of fullBattle!.participants) {
      this.gateway.emitToUser(p.userId, 'battle.start', {
        battleId: fullBattle!.id,
        type: 'private',
        problem: fullBattle!.problem,
        durationSeconds: fullBattle!.durationSeconds,
        endsAt: fullBattle!.endsAt?.toISOString(),
        opponents: fullBattle!.participants
          .filter((op) => op.userId !== p.userId)
          .map((op) => ({ userId: op.userId, fullName: op.user.fullName })),
      });
    }

    return this.mapBattleSummary(fullBattle!);
  }

  // ---- Get battle ----

  async getBattle(battleId: string) {
    await this.finalizeBattleIfDue(battleId);
    const battle = await this.repository.findBattleById(battleId);
    if (!battle) {
      throw new NotFoundException({ code: 'BATTLE_NOT_FOUND', message: 'Battle not found' });
    }
    return this.mapBattleSummary(battle);
  }

  // ---- Submissions ----

  async assertSubmittable(userId: string, battleId: string, problemId: string) {
    const battle = await this.repository.findBattleById(battleId);
    if (!battle) {
      throw new NotFoundException({ code: 'BATTLE_NOT_FOUND', message: 'Battle not found' });
    }
    if (battle.status === 'pending') {
      throw new BadRequestException({
        code: 'BATTLE_NOT_ACTIVE',
        message: 'Battle has not started',
      });
    }
    if (battle.status === 'finished' || battle.status === 'cancelled') {
      throw new BadRequestException({ code: 'BATTLE_ENDED', message: 'Battle has ended' });
    }

    const now = new Date();
    if (battle.startedAt && now < battle.startedAt) {
      throw new BadRequestException({
        code: 'BATTLE_NOT_STARTED',
        message: 'Battle has not started yet',
      });
    }
    if (battle.endsAt && now > battle.endsAt) {
      throw new BadRequestException({ code: 'BATTLE_ENDED', message: 'Battle has ended' });
    }

    const participant = await this.repository.findParticipant(battleId, userId);
    if (!participant) {
      throw new BadRequestException({
        code: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this battle',
      });
    }

    if (battle.problemId !== problemId) {
      throw new BadRequestException({
        code: 'PROBLEM_NOT_IN_BATTLE',
        message: 'This problem is not part of the battle',
      });
    }
  }

  async submitCode(userId: string, battleId: string, dto: SubmitBattleCodeDto) {
    // DsaService.submitCode will call assertSubmittable when it sees battleId.
    const result = await this.dsa.submitCode(userId, dto.problemId, {
      sourceCode: dto.sourceCode,
      languageId: dto.languageId,
      battleId,
    });

    return { submissionId: result.submissionId, status: result.status, battleId };
  }

  /**
   * Called by DsaService.gradeSubmission after a battle submission is graded.
   * Applies the battle time boundary: a submission completing after endsAt is
   * still graded but excluded from the battle result.
   */
  async onSubmissionGraded(submission: {
    id: string;
    userId: string;
    battleId?: string | null;
    problemId: string;
    verdict: string | null;
    completedAt: Date | null;
  }) {
    if (!submission.battleId) return;

    const battle = await this.repository.findBattleById(submission.battleId);
    if (!battle || battle.status !== 'active') return;

    const completedAt = submission.completedAt ?? new Date();
    if (battle.startedAt && completedAt < battle.startedAt) return;
    if (battle.endsAt && completedAt > battle.endsAt) return;

    const participant = await this.repository.findParticipant(battle.id, submission.userId);
    if (!participant) return;

    const isAccepted = submission.verdict === 'accepted';
    const elapsedSeconds = battle.startedAt
      ? Math.floor((completedAt.getTime() - battle.startedAt.getTime()) / 1000)
      : 0;

    if (isAccepted && !participant.solvedAt) {
      await this.repository.updateParticipantScore(
        participant.id,
        100, // basePoints
        elapsedSeconds,
        completedAt,
      );

      // Emit progress to both participants.
      for (const p of battle.participants) {
        this.gateway.emitToUser(p.userId, 'battle.progress', {
          battleId: battle.id,
          userId: submission.userId,
          submissionId: submission.id,
          verdict: submission.verdict,
          solved: true,
          elapsedSeconds,
        });
      }

      // First to solve — end battle immediately.
      await this.endBattle(battle.id, submission.userId);
    } else {
      // Non-accepted verdict — still emit progress.
      for (const p of battle.participants) {
        this.gateway.emitToUser(p.userId, 'battle.progress', {
          battleId: battle.id,
          userId: submission.userId,
          submissionId: submission.id,
          verdict: submission.verdict,
          solved: false,
          elapsedSeconds,
        });
      }
    }
  }

  // ---- End / Finalize ----

  private async endBattle(battleId: string, winnerId?: string) {
    const now = new Date();
    await this.repository.updateBattle(battleId, {
      status: 'finished',
      finishedAt: now,
      winnerId,
    });

    const battle = await this.repository.findBattleById(battleId);
    if (!battle) return;

    // Apply rating for ranked battles.
    if (battle.type === 'ranked') {
      await this.finalizeRankedBattle(battle.id);
    }

    // Notify participants.
    for (const p of battle.participants) {
      this.gateway.emitToUser(p.userId, 'battle.end', {
        battleId: battle.id,
        winnerId,
        status: 'finished',
        participants: battle.participants.map((bp) => ({
          userId: bp.userId,
          fullName: bp.user.fullName,
          score: bp.score,
          penaltySeconds: bp.penaltySeconds,
        })),
      });
    }
  }

  /**
   * Lazy finalization: when reads arrive for a battle past its endsAt, finalize
   * any pending ranked battle. Mirrors the 5.5c contest pattern.
   */
  async finalizeDueBattles() {
    const due = await this.repository.findDueRankedBattles(new Date());
    for (const { id } of due) {
      await this.finalizeRankedBattle(id);
    }
  }

  private async finalizeBattleIfDue(battleId: string) {
    const battle = await this.repository.findBattleById(battleId);
    if (!battle) return;
    if (battle.status === 'active' && battle.endsAt && new Date() > battle.endsAt) {
      await this.endBattle(battle.id, battle.winnerId ?? undefined);
    }
    if (battle.type === 'ranked' && !battle.ratingAppliedAt && battle.status === 'finished') {
      await this.finalizeRankedBattle(battle.id);
    }
  }

  private async finalizeRankedBattle(battleId: string) {
    const claimed = await this.repository.claimBattleFinalization(battleId, new Date());
    if (claimed.count === 0) return;

    const battle = await this.repository.findBattleById(battleId);
    if (!battle) return;

    const submissions = await this.repository.findBattleSubmissions(battleId);
    const participants = battle.participants;

    // Determine winner from submissions.
    const acceptedSubmissions = submissions.filter((s) => s.verdict === 'accepted');
    acceptedSubmissions.sort(
      (a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    );
    const winnerId = acceptedSubmissions.length > 0 ? acceptedSubmissions[0].userId : null;

    // Update battle with winner.
    await this.repository.updateBattle(battleId, { winnerId: winnerId ?? undefined });

    // Load rating state for both participants.
    const ratings = new Map<string, { rating: number; participated: number }>();
    for (const p of participants) {
      const row = await this.repository.getCodingRating(p.userId);
      ratings.set(p.userId, {
        rating: row?.rating ?? INITIAL_RATING,
        participated: row?.contestsParticipated ?? 0,
      });
    }

    // Compute rank for each participant.
    for (const p of participants) {
      const current = ratings.get(p.userId)!.rating;
      const isWinner = p.userId === winnerId;
      const isLoser = winnerId !== null && !isWinner;

      let userRank: number;
      if (winnerId === null) {
        userRank = 1.5; // draw
      } else {
        userRank = isWinner ? 1 : 2;
      }

      const opponentRatings = participants
        .filter((op) => op.userId !== p.userId)
        .map((op) => ratings.get(op.userId)!.rating);

      const update = computeRatingUpdate({
        currentRating: current,
        contestsParticipated: ratings.get(p.userId)!.participated,
        userRank,
        opponentRatings,
      });

      await this.repository.setParticipantResult(
        p.id,
        isWinner ? 1 : isLoser ? 2 : 1,
        current,
        update.newRating,
        update.delta,
      );

      const bestRating = Math.max(update.newRating, current);
      const codingRating = await this.repository.upsertCodingRating(
        p.userId,
        update.newRating,
        bestRating,
        ratings.get(p.userId)!.participated + 1,
      );

      await this.repository.createRatingHistory({
        codingRatingId: codingRating.id,
        userId: p.userId,
        battleId,
        rank: isWinner ? 1 : isLoser ? 2 : 1,
        ratingBefore: current,
        ratingAfter: update.newRating,
        delta: update.delta,
      });

      await this.ranking.upsert(RATING_KEY, p.userId, update.newRating);
    }
  }

  // ---- Rating / History ----

  async getMyRating(userId: string) {
    await this.finalizeDueBattles();
    const row = await this.repository.getCodingRating(userId);
    const rating = row?.rating ?? INITIAL_RATING;
    const rank = await this.ranking.rankOf(RATING_KEY, userId);
    return {
      rating,
      bestRating: row?.bestRating ?? rating,
      battlesParticipated: row?.contestsParticipated ?? 0,
      tier: ratingTier(rating),
      globalRank: rank === null ? null : rank + 1,
      provisional: (row?.contestsParticipated ?? 0) < 10,
    };
  }

  async getRatingHistory(userId: string) {
    await this.finalizeDueBattles();
    const history = await this.repository.findRatingHistory(userId);
    return {
      data: history.map((point) => ({
        battleId: point.battleId,
        rank: point.rank,
        ratingBefore: point.ratingBefore,
        ratingAfter: point.ratingAfter,
        delta: point.delta,
        date: point.createdAt.toISOString(),
      })),
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.repository.findBattlesForUser(userId, page, limit),
      this.repository.countBattlesForUser(userId),
    ]);
    return {
      data: data.map((entry) => ({
        battleId: entry.battle.id,
        type: entry.battle.type,
        status: entry.battle.status,
        problem: entry.battle.problem,
        score: entry.score,
        rank: entry.rank,
        winnerId: entry.battle.winnerId,
        startedAt: entry.battle.startedAt?.toISOString(),
        finishedAt: entry.battle.finishedAt?.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ---- Helpers ----

  private async getUserRating(userId: string): Promise<number> {
    const row = await this.repository.getCodingRating(userId);
    return row?.rating ?? INITIAL_RATING;
  }

  private mapBattleSummary(battle: {
    id: string;
    type: string;
    status: string;
    durationSeconds: number;
    startedAt: Date | null;
    endsAt: Date | null;
    finishedAt: Date | null;
    winnerId: string | null;
    inviteCode: string | null;
    createdAt: Date;
    problem: { id: string; slug: string; title: string; difficulty: string };
    participants: Array<{
      userId: string;
      score: number;
      rank: number | null;
      solvedAt: Date | null;
      user: { id: string; fullName: string };
    }>;
  }) {
    return {
      id: battle.id,
      type: battle.type,
      status: battle.status,
      problem: battle.problem,
      durationSeconds: battle.durationSeconds,
      startedAt: battle.startedAt?.toISOString(),
      endsAt: battle.endsAt?.toISOString(),
      finishedAt: battle.finishedAt?.toISOString(),
      winnerId: battle.winnerId,
      inviteCode: battle.inviteCode,
      participants: battle.participants.map((p) => ({
        userId: p.userId,
        fullName: p.user.fullName,
        score: p.score,
        rank: p.rank,
        solvedAt: p.solvedAt?.toISOString(),
      })),
    };
  }
}
