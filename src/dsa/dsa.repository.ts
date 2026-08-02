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
    contestId?: string;
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

  // ---- Playlists ----

  countPlaylistsByUser(userId: string): Promise<number> {
    return this.prisma.playlist.count({ where: { userId } });
  }

  findPlaylistsByUser(userId: string, page: number, limit: number) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: { problems: { select: { problemId: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findPlaylistById(id: string) {
    return this.prisma.playlist.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: { select: { id: true, slug: true, title: true, difficulty: true } },
          },
        },
      },
    });
  }

  createPlaylist(
    userId: string,
    data: { title: string; description?: string; isPublic?: boolean },
  ) {
    return this.prisma.playlist.create({ data: { userId, ...data } });
  }

  updatePlaylist(id: string, data: { title?: string; description?: string; isPublic?: boolean }) {
    return this.prisma.playlist.update({ where: { id }, data });
  }

  deletePlaylist(id: string) {
    return this.prisma.playlist.delete({ where: { id } });
  }

  async addPlaylistProblem(playlistId: string, problemId: string) {
    const count = await this.prisma.playlistProblem.count({ where: { playlistId } });
    return this.prisma.playlistProblem.upsert({
      where: { playlistId_problemId: { playlistId, problemId } },
      update: {},
      create: { playlistId, problemId, order: count + 1 },
    });
  }

  removePlaylistProblem(playlistId: string, problemId: string) {
    return this.prisma.playlistProblem.deleteMany({
      where: { playlistId, problemId },
    });
  }

  // ---- Sheets ----

  findActiveSheets() {
    return this.prisma.sheet.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { problems: { orderBy: { order: 'asc' }, select: { problemId: true } } },
    });
  }

  findSheetById(id: string) {
    return this.prisma.sheet.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                topics: true,
                companies: true,
              },
            },
          },
        },
      },
    });
  }

  // ---- Live solved state (progress/analytics are computed, never cached) ----

  findSolvedProblems(userId: string) {
    return this.prisma.solvedProblem.findMany({
      where: { userId },
      include: {
        problem: { select: { difficulty: true, topics: true, companies: true } },
      },
    });
  }

  findSolvedProblemIds(userId: string): Promise<string[]> {
    return this.prisma.solvedProblem
      .findMany({ where: { userId }, select: { problemId: true } })
      .then((rows) => rows.map((row) => row.problemId));
  }

  findSubmissionsForAnalytics(userId: string) {
    return this.prisma.submission.findMany({
      where: { userId },
      select: {
        verdict: true,
        timeMs: true,
        problemId: true,
        submittedAt: true,
        problem: { select: { topics: true } },
      },
    });
  }

  // ---- Recruiter-visibility settings ----

  findVisibility(userId: string) {
    return this.prisma.dsaProfileVisibility.findUnique({ where: { userId } });
  }

  upsertVisibility(
    userId: string,
    data: Partial<{
      showFullName: boolean;
      showEmail: boolean;
      showCollege: boolean;
      showSkills: boolean;
      showSolvedCount: boolean;
      showTopics: boolean;
      showStreak: boolean;
      showRating: boolean;
    }>,
  ) {
    return this.prisma.dsaProfileVisibility.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // ---- Discussion ----

  createDiscussion(data: { problemId: string; authorId: string; title: string; body: string }) {
    return this.prisma.discussion.create({ data });
  }

  findDiscussions(problemId: string, userId: string, page: number, limit: number) {
    return this.prisma.discussion.findMany({
      where: { problemId },
      include: {
        author: { select: { id: true, fullName: true } },
        votes: { where: { userId }, select: { id: true } },
      },
      orderBy: [{ upvoteCount: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  countDiscussions(problemId: string): Promise<number> {
    return this.prisma.discussion.count({ where: { problemId } });
  }

  findDiscussionById(id: string) {
    return this.prisma.discussion.findUnique({ where: { id } });
  }

  /** Idempotent upvote: creates a vote row and increments the counter once. */
  async upvoteDiscussion(discussionId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.discussionVote.findUnique({
        where: { discussionId_userId: { discussionId, userId } },
      });
      if (existing) {
        const discussion = await tx.discussion.findUnique({ where: { id: discussionId } });
        return { created: false, discussion };
      }
      await tx.discussionVote.create({ data: { discussionId, userId } });
      const discussion = await tx.discussion.update({
        where: { id: discussionId },
        data: { upvoteCount: { increment: 1 } },
      });
      return { created: true, discussion };
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
