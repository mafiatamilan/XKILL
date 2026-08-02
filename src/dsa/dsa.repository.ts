import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JudgeTestCase } from '../judge/judge.service';

export interface ProblemFilters {
  difficulty?: string;
  topic?: string;
  company?: string;
  tag?: string;
  search?: string;
}

const problemSummary = Prisma.validator<Prisma.ProblemDefaultArgs>()({
  select: {
    id: true,
    slug: true,
    title: true,
    difficulty: true,
    topics: true,
    companies: true,
    tags: true,
    timeLimitMs: true,
    memoryLimitMb: true,
    isPremium: true,
  },
});

void problemSummary;

export type ProblemSummary = Prisma.ProblemGetPayload<typeof problemSummary>;

const submissionDetail = Prisma.validator<Prisma.SubmissionDefaultArgs>()({
  include: {
    problem: {
      select: { id: true, title: true, difficulty: true, timeLimitMs: true, memoryLimitMb: true },
    },
  },
});

void submissionDetail;

export type SubmissionDetail = Prisma.SubmissionGetPayload<typeof submissionDetail>;

@Injectable()
export class DsaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Problems ----

  async countProblems(filters: ProblemFilters): Promise<number> {
    return this.prisma.problem.count({ where: this.problemWhere(filters) });
  }

  async findProblems(
    filters: ProblemFilters,
    page: number,
    limit: number,
    sortBy: string,
    order: 'asc' | 'desc',
  ): Promise<ProblemSummary[]> {
    const allowedSorts = ['createdAt', 'difficulty', 'title'];
    const field = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    return this.prisma.problem.findMany({
      where: this.problemWhere(filters),
      select: problemSummary.select,
      orderBy: { [field]: order },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findProblemById(
    id: string,
  ): Promise<Prisma.ProblemGetPayload<{ include: { testCases: true } }> | null> {
    return this.prisma.problem.findUnique({
      where: { id },
      include: { testCases: true },
    });
  }

  findProblemBySlug(
    slug: string,
  ): Promise<Prisma.ProblemGetPayload<{ include: { testCases: true } }> | null> {
    return this.prisma.problem.findUnique({
      where: { slug },
      include: { testCases: true },
    });
  }

  findSampleTestCases(problemId: string) {
    return this.prisma.testCase.findMany({
      where: { problemId, isSample: true },
      orderBy: { order: 'asc' },
    });
  }

  findHiddenTestCases(problemId: string): Promise<JudgeTestCase[]> {
    return this.prisma.testCase
      .findMany({
        where: { problemId, isSample: false },
        orderBy: { order: 'asc' },
        select: { input: true, expectedOutput: true },
      })
      .then((testCases) =>
        testCases.map((testCase) => ({
          stdin: testCase.input,
          expectedOutput: testCase.expectedOutput,
        })),
      );
  }

  // ---- Editorial / hints ----

  findEditorial(problemId: string) {
    return this.prisma.editorial.findUnique({ where: { problemId } });
  }

  findHints(problemId: string) {
    return this.prisma.hint.findMany({
      where: { problemId },
      orderBy: { order: 'asc' },
    });
  }

  findHintUnlock(userId: string, problemId: string) {
    return this.prisma.hintUnlock.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
  }

  upsertHintUnlock(userId: string, problemId: string, unlockedHints: number) {
    return this.prisma.hintUnlock.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: { unlockedHints },
      create: { userId, problemId, unlockedHints },
    });
  }

  // ---- Submissions ----

  createSubmission(data: {
    userId: string;
    problemId: string;
    languageId: number;
    sourceCode: string;
  }) {
    return this.prisma.submission.create({ data });
  }

  findSubmissionById(id: string): Promise<SubmissionDetail | null> {
    return this.prisma.submission.findUnique({
      where: { id },
      include: submissionDetail.include,
    });
  }

  countSubmissions(userId: string, problemId?: string, verdict?: string): Promise<number> {
    return this.prisma.submission.count({
      where: { userId, problemId, verdict },
    });
  }

  findSubmissions(
    userId: string,
    problemId: string | undefined,
    verdict: string | undefined,
    page: number,
    limit: number,
  ): Promise<SubmissionDetail[]> {
    return this.prisma.submission.findMany({
      where: { userId, problemId, verdict },
      include: submissionDetail.include,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  updateSubmission(
    id: string,
    data: Prisma.SubmissionUpdateInput,
  ): Promise<Prisma.SubmissionGetPayload<Record<string, never>>> {
    return this.prisma.submission.update({ where: { id }, data });
  }

  // ---- Solved problems (derived state, single-row per user+problem) ----

  markSolved(userId: string, problemId: string) {
    return this.prisma.solvedProblem.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: {},
      create: { userId, problemId },
    });
  }

  countSolved(userId: string): Promise<number> {
    return this.prisma.solvedProblem.count({ where: { userId } });
  }

  findSolvedByUserAndProblem(userId: string, problemId: string) {
    return this.prisma.solvedProblem.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
  }

  private problemWhere(filters: ProblemFilters): Prisma.ProblemWhereInput {
    const where: Prisma.ProblemWhereInput = { isActive: true };
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.topic) where.topics = { has: filters.topic };
    if (filters.company) where.companies = { has: filters.company };
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }
    return where;
  }
}

export type { JudgeTestCase };
