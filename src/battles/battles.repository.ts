import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BattleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Battles ----

  createBattle(data: {
    type: string;
    status?: string;
    problemId: string;
    durationSeconds: number;
    startedAt?: Date;
    endsAt?: Date;
    inviteCode?: string;
    createdById?: string;
    participants: Array<{ userId: string; rating?: number }>;
  }) {
    return this.prisma.battle.create({
      data: {
        type: data.type,
        status: data.status ?? 'active',
        problemId: data.problemId,
        durationSeconds: data.durationSeconds,
        startedAt: data.startedAt,
        endsAt: data.endsAt,
        inviteCode: data.inviteCode,
        createdById: data.createdById,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            ratingBefore: p.rating,
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true } } } },
        problem: { select: { id: true, slug: true, title: true, difficulty: true } },
      },
    });
  }

  findBattleById(id: string) {
    return this.prisma.battle.findUnique({
      where: { id },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true } } } },
        problem: { select: { id: true, slug: true, title: true, difficulty: true } },
      },
    });
  }

  findBattleByInviteCode(inviteCode: string) {
    return this.prisma.battle.findUnique({
      where: { inviteCode },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true } } } },
        problem: { select: { id: true, slug: true, title: true, difficulty: true } },
      },
    });
  }

  updateBattle(
    id: string,
    data: {
      status?: string;
      startedAt?: Date;
      endsAt?: Date;
      finishedAt?: Date;
      winnerId?: string;
      ratingAppliedAt?: Date;
    },
  ) {
    return this.prisma.battle.update({ where: { id }, data });
  }

  // ---- Participants ----

  addParticipant(battleId: string, userId: string, rating?: number) {
    return this.prisma.battleParticipant.create({
      data: { battleId, userId, ratingBefore: rating },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  findParticipant(battleId: string, userId: string) {
    return this.prisma.battleParticipant.findUnique({
      where: { battleId_userId: { battleId, userId } },
    });
  }

  updateParticipantScore(
    participantId: string,
    score: number,
    penaltySeconds: number,
    solvedAt?: Date,
  ) {
    return this.prisma.battleParticipant.update({
      where: { id: participantId },
      data: { score, penaltySeconds, ...(solvedAt ? { solvedAt } : {}) },
    });
  }

  findParticipants(battleId: string) {
    return this.prisma.battleParticipant.findMany({
      where: { battleId },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  setParticipantResult(
    participantId: string,
    rank: number,
    ratingBefore: number,
    ratingAfter: number,
    delta: number,
  ) {
    return this.prisma.battleParticipant.update({
      where: { id: participantId },
      data: { rank, ratingBefore, ratingAfter, ratingDelta: delta },
    });
  }

  // ---- Problem ----

  countActiveProblems(): Promise<number> {
    return this.prisma.problem.count({ where: { isActive: true } });
  }

  findRandomProblem() {
    return this.prisma.problem.findFirst({ where: { isActive: true } });
  }

  // ---- Rating ----

  getCodingRating(userId: string) {
    return this.prisma.codingRating.findUnique({ where: { userId } });
  }

  upsertCodingRating(
    userId: string,
    rating: number,
    bestRating: number,
    battlesParticipated: number,
  ) {
    return this.prisma.codingRating.upsert({
      where: { userId },
      create: { userId, rating, bestRating, contestsParticipated: battlesParticipated },
      update: { rating, bestRating, contestsParticipated: battlesParticipated },
    });
  }

  createRatingHistory(data: {
    codingRatingId: string;
    userId: string;
    battleId: string;
    rank: number;
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
  }) {
    return this.prisma.codingRatingHistory.create({
      data: {
        codingRatingId: data.codingRatingId,
        userId: data.userId,
        source: 'battle',
        battleId: data.battleId,
        contestName: 'Ranked Battle',
        rank: data.rank,
        ratingBefore: data.ratingBefore,
        ratingAfter: data.ratingAfter,
        delta: data.delta,
      },
    });
  }

  findRatingHistory(userId: string) {
    return this.prisma.codingRatingHistory.findMany({
      where: { userId, source: 'battle' },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---- Finalization ----

  findDueRankedBattles(now: Date) {
    return this.prisma.battle.findMany({
      where: { type: 'ranked', status: 'active', ratingAppliedAt: null, endsAt: { lt: now } },
      select: { id: true },
    });
  }

  claimBattleFinalization(battleId: string, at: Date) {
    return this.prisma.battle.updateMany({
      where: { id: battleId, ratingAppliedAt: null },
      data: { ratingAppliedAt: at, finishedAt: at, status: 'finished' },
    });
  }

  findBattleSubmissions(battleId: string) {
    return this.prisma.submission.findMany({
      where: { battleId },
      select: { userId: true, verdict: true, completedAt: true, submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // ---- Match history ----

  findUserBattleIds(userId: string): Promise<string[]> {
    return this.prisma.battleParticipant
      .findMany({ where: { userId }, select: { battleId: true } })
      .then((rows) => rows.map((r) => r.battleId));
  }

  findBattlesForUser(userId: string, page: number, limit: number) {
    return this.prisma.battleParticipant.findMany({
      where: { userId },
      include: {
        battle: {
          include: {
            participants: { include: { user: { select: { id: true, fullName: true } } } },
            problem: { select: { id: true, slug: true, title: true, difficulty: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  countBattlesForUser(userId: string) {
    return this.prisma.battleParticipant.count({ where: { userId } });
  }
}
