import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ContestProblemSeed {
  problemId: string;
  order?: number;
  basePoints?: number;
}

@Injectable()
export class DsaCompeteRepository {
  constructor(private readonly prisma: PrismaService) {}

  createContest(data: {
    slug: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isRated: boolean;
    rules?: string;
    createdBy: string;
    problems: ContestProblemSeed[];
  }) {
    return this.prisma.contest.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        isRated: data.isRated,
        rules: data.rules,
        createdBy: data.createdBy,
        problems: {
          create: data.problems.map((problem, index) => ({
            problemId: problem.problemId,
            order: problem.order ?? index,
            basePoints: problem.basePoints ?? 100,
          })),
        },
      },
      include: {
        problems: {
          include: { problem: { select: { id: true, slug: true, title: true, difficulty: true } } },
        },
      },
    });
  }

  findContestById(id: string) {
    return this.prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: { problem: { select: { id: true, slug: true, title: true, difficulty: true } } },
        },
      },
    });
  }

  findContestBySlug(slug: string) {
    return this.prisma.contest.findUnique({
      where: { slug },
      include: {
        problems: {
          include: { problem: { select: { id: true, slug: true, title: true, difficulty: true } } },
        },
      },
    });
  }

  listContests(page: number, limit: number, status?: string) {
    const where = status ? { status } : {};
    return this.prisma.contest.findMany({
      where,
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { participants: true } },
      },
    });
  }

  countContests(status?: string) {
    return this.prisma.contest.count({ where: status ? { status } : {} });
  }

  updateContest(
    id: string,
    data: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      isRated?: boolean;
      rules?: string;
      status?: string;
    },
  ) {
    return this.prisma.contest.update({ where: { id }, data });
  }

  replaceContestProblems(contestId: string, problems: ContestProblemSeed[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.contestProblem.deleteMany({ where: { contestId } });
      await tx.contestProblem.createMany({
        data: problems.map((problem, index) => ({
          contestId,
          problemId: problem.problemId,
          order: problem.order ?? index,
          basePoints: problem.basePoints ?? 100,
        })),
      });
    });
  }

  deleteContest(id: string) {
    return this.prisma.contest.delete({ where: { id } });
  }

  upsertParticipant(contestId: string, userId: string) {
    return this.prisma.contestParticipant.upsert({
      where: { contestId_userId: { contestId, userId } },
      create: { contestId, userId },
      update: {},
    });
  }

  createParticipant(contestId: string, userId: string) {
    return this.prisma.contestParticipant.create({ data: { contestId, userId } });
  }

  findParticipant(contestId: string, userId: string) {
    return this.prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId, userId } },
    });
  }

  findContestProblem(contestId: string, problemId: string) {
    return this.prisma.contestProblem.findUnique({
      where: { contestId_problemId: { contestId, problemId } },
    });
  }

  findSolve(participantId: string, contestProblemId: string) {
    return this.prisma.contestSolve.findUnique({
      where: { participantId_contestProblemId: { participantId, contestProblemId } },
    });
  }

  upsertSolveAttempt(
    participantId: string,
    contestProblemId: string,
    attemptCount: number,
    options: { firstAcceptedAt?: Date; maxPointsEarned?: number },
  ) {
    const data: Record<string, unknown> = { attemptCount };
    if (options.firstAcceptedAt) {
      data.firstAcceptedAt = options.firstAcceptedAt;
      data.maxPointsEarned = options.maxPointsEarned ?? 0;
    }
    return this.prisma.contestSolve.upsert({
      where: { participantId_contestProblemId: { participantId, contestProblemId } },
      create: {
        participantId,
        contestProblemId,
        attemptCount,
        firstAcceptedAt: options.firstAcceptedAt,
        maxPointsEarned: options.maxPointsEarned ?? 0,
      },
      update: data,
    });
  }

  findSolvesForParticipant(participantId: string) {
    return this.prisma.contestSolve.findMany({
      where: { participantId },
      include: { contestProblem: { select: { order: true, basePoints: true } } },
    });
  }

  updateParticipantScore(participantId: string, score: number, penaltySeconds: number) {
    return this.prisma.contestParticipant.update({
      where: { id: participantId },
      data: { score, penaltySeconds },
    });
  }

  findParticipantsForStandings(contestId: string) {
    return this.prisma.contestParticipant.findMany({
      where: { contestId },
      include: {
        user: { select: { id: true, fullName: true } },
        solvedProblems: { select: { maxPointsEarned: true, firstAcceptedAt: true } },
      },
    });
  }

  findDueRatedContests(now: Date) {
    return this.prisma.contest.findMany({
      where: { isRated: true, standingsFinalizedAt: null, endTime: { lt: now } },
      select: { id: true },
    });
  }

  claimStandings(contestId: string, at: Date) {
    return this.prisma.contest.updateMany({
      where: { id: contestId, standingsFinalizedAt: null },
      data: { standingsFinalizedAt: at },
    });
  }

  setParticipantRating(
    participantId: string,
    rank: number,
    ratingBefore: number,
    ratingAfter: number,
    delta: number,
  ) {
    return this.prisma.contestParticipant.update({
      where: { id: participantId },
      data: { rank, ratingBefore, ratingAfter, ratingDelta: delta },
    });
  }

  // ---- Rating ----

  getCodingRating(userId: string) {
    return this.prisma.codingRating.findUnique({ where: { userId } });
  }

  upsertCodingRating(
    userId: string,
    rating: number,
    bestRating: number,
    contestsParticipated: number,
  ) {
    return this.prisma.codingRating.upsert({
      where: { userId },
      create: { userId, rating, bestRating, contestsParticipated },
      update: { rating, bestRating, contestsParticipated },
    });
  }

  createRatingHistory(data: {
    codingRatingId: string;
    userId: string;
    contestId: string;
    contestName: string;
    rank: number;
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
  }) {
    return this.prisma.codingRatingHistory.create({
      data: {
        codingRatingId: data.codingRatingId,
        userId: data.userId,
        contestId: data.contestId,
        contestName: data.contestName,
        rank: data.rank,
        ratingBefore: data.ratingBefore,
        ratingAfter: data.ratingAfter,
        delta: data.delta,
      },
    });
  }

  findRatingHistory(userId: string) {
    return this.prisma.codingRatingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  countCodingRatings() {
    return this.prisma.codingRating.count();
  }

  // ---- Anti-cheat ----

  createAntiCheatEvent(data: {
    sourceType: string;
    sourceId: string;
    userId: string;
    eventType: string;
    detail?: Prisma.InputJsonValue;
  }) {
    return this.prisma.antiCheatEvent.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId,
        eventType: data.eventType,
        detail: data.detail === undefined ? Prisma.JsonNull : data.detail,
      },
    });
  }
}
