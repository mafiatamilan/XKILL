import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JudgeTestCase } from '../judge/judge.service';

export interface SkillProfileRow {
  name: string;
  category: string;
  proficiencyLevel: string;
  yearsOfExperience: number | null;
  isPrimary: boolean;
}

export interface InterviewProblem {
  id: string;
  title: string;
  difficulty: string;
  topics: string[];
  statement: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  hiddenTestCases: JudgeTestCase[];
}

export interface TurnInput {
  role: 'ai' | 'user';
  content: string;
  code?: string | null;
  languageId?: number | null;
  judgeVerdict?: string | null;
  passedTestCases?: number | null;
  totalTestCases?: number | null;
  timeMs?: number | null;
  memoryKb?: number | null;
}

export interface FeedbackInput {
  skill: string;
  score: number;
  comment: string;
}

const sessionTurns = Prisma.validator<Prisma.InterviewSessionDefaultArgs>()({
  include: {
    turns: { orderBy: { order: 'asc' as const } },
    report: true,
  },
});

void sessionTurns;

export type InterviewSessionWithTurns = Prisma.InterviewSessionGetPayload<typeof sessionTurns>;

@Injectable()
export class InterviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(data: { userId: string; type: string; mode: string; problemId?: string }) {
    return this.prisma.interviewSession.create({
      data: {
        userId: data.userId,
        type: data.type,
        mode: data.mode,
        problemId: data.problemId,
        status: 'created',
      },
    });
  }

  findSessionById(id: string): Promise<InterviewSessionWithTurns | null> {
    return this.prisma.interviewSession.findUnique({
      where: { id },
      include: sessionTurns.include,
    });
  }

  countSessions(userId: string): Promise<number> {
    return this.prisma.interviewSession.count({ where: { userId } });
  }

  listSessions(userId: string, page: number, limit: number) {
    return this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { report: { select: { overallScore: true } } },
    });
  }

  findProblemById(id: string): Promise<InterviewProblem | null> {
    return this.prisma.problem
      .findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          difficulty: true,
          topics: true,
          statement: true,
          timeLimitMs: true,
          memoryLimitMb: true,
          testCases: {
            where: { isSample: false },
            orderBy: { order: 'asc' },
            select: { input: true, expectedOutput: true },
          },
        },
      })
      .then((problem) =>
        problem
          ? {
              ...problem,
              hiddenTestCases: problem.testCases.map((testCase) => ({
                stdin: testCase.input,
                expectedOutput: testCase.expectedOutput,
              })),
            }
          : null,
      );
  }

  findSkillProfile(userId: string, limit = 10): Promise<SkillProfileRow[]> {
    return this.prisma.skillProfile.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { proficiencyLevel: 'asc' }],
      take: limit,
      select: {
        name: true,
        category: true,
        proficiencyLevel: true,
        yearsOfExperience: true,
        isPrimary: true,
      },
    });
  }

  async addTurnPair(
    sessionId: string,
    userTurn: TurnInput,
    aiTurn: TurnInput,
    feedback: FeedbackInput[],
  ): Promise<{ userTurnId: string; aiTurnId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const turnCount = await tx.interviewTurn.count({ where: { sessionId } });
      const userTurnRow = await tx.interviewTurn.create({
        data: {
          sessionId,
          role: userTurn.role,
          content: userTurn.content,
          code: userTurn.code ?? null,
          languageId: userTurn.languageId ?? null,
          judgeVerdict: userTurn.judgeVerdict ?? null,
          passedTestCases: userTurn.passedTestCases ?? null,
          totalTestCases: userTurn.totalTestCases ?? null,
          timeMs: userTurn.timeMs ?? null,
          memoryKb: userTurn.memoryKb ?? null,
          order: turnCount,
        },
      });
      const aiTurnRow = await tx.interviewTurn.create({
        data: {
          sessionId,
          role: aiTurn.role,
          content: aiTurn.content,
          order: turnCount + 1,
        },
      });
      if (feedback.length > 0) {
        await tx.interviewFeedback.createMany({
          data: feedback.map((item) => ({
            sessionId,
            turnId: userTurnRow.id,
            skill: item.skill,
            score: item.score,
            comment: item.comment,
          })),
        });
      }
      return { userTurnId: userTurnRow.id, aiTurnId: aiTurnRow.id };
    });
  }

  async createFirstAiTurn(sessionId: string, content: string): Promise<void> {
    await this.prisma.interviewTurn.create({
      data: { sessionId, role: 'ai', content, order: 0 },
    });
  }

  async markStarted(sessionId: string, startedAt: Date): Promise<void> {
    await this.prisma.interviewSession.updateMany({
      where: { id: sessionId, status: 'created' },
      data: { status: 'in_progress', startedAt },
    });
  }

  async endSession(sessionId: string, endedAt: Date): Promise<void> {
    await this.prisma.interviewSession.updateMany({
      where: { id: sessionId, status: { not: 'ended' } },
      data: { status: 'ended', endedAt },
    });
  }

  createReport(data: {
    sessionId: string;
    overallScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    topicScores: Record<string, number> | null;
  }) {
    return this.prisma.interviewReport.create({
      data: {
        sessionId: data.sessionId,
        overallScore: data.overallScore,
        summary: data.summary,
        strengths: data.strengths,
        improvements: data.improvements,
        suggestions: data.suggestions,
        topicScores: data.topicScores ?? Prisma.JsonNull,
      },
    });
  }

  findReport(sessionId: string) {
    return this.prisma.interviewReport.findUnique({ where: { sessionId } });
  }
}
