import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InterviewRepository } from './interview.repository';

describe('InterviewRepository', () => {
  let repository: InterviewRepository;
  let prisma: {
    interviewSession: Record<string, jest.Mock>;
    interviewTurn: Record<string, jest.Mock>;
    interviewFeedback: Record<string, jest.Mock>;
    interviewReport: Record<string, jest.Mock>;
    problem: Record<string, jest.Mock>;
    skillProfile: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InterviewRepository,
        {
          provide: PrismaService,
          useValue: {
            interviewSession: {
              create: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            interviewTurn: { create: jest.fn(), count: jest.fn() },
            interviewFeedback: { createMany: jest.fn() },
            interviewReport: { create: jest.fn(), findUnique: jest.fn() },
            problem: { findUnique: jest.fn() },
            skillProfile: { findMany: jest.fn() },
            $transaction: jest
              .fn()
              .mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma)),
          },
        },
      ],
    }).compile();
    repository = module.get(InterviewRepository);
    prisma = module.get(PrismaService) as unknown as typeof prisma;
  });

  it('creates a session', async () => {
    prisma.interviewSession.create.mockResolvedValue({ id: 's1' });
    await repository.createSession({
      userId: 'u1',
      type: 'hr',
      mode: 'text',
      problemId: undefined,
    });
    expect(prisma.interviewSession.create).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'hr', mode: 'text', problemId: undefined, status: 'created' },
    });
  });

  it('finds a session with ordered turns and report', async () => {
    prisma.interviewSession.findUnique.mockResolvedValue({ id: 's1' });
    const result = await repository.findSessionById('s1');
    expect(result).toEqual({ id: 's1' });
    expect(prisma.interviewSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        include: expect.objectContaining({ turns: { orderBy: { order: 'asc' } }, report: true }),
      }),
    );
  });

  it('counts and lists sessions', async () => {
    prisma.interviewSession.count.mockResolvedValue(3);
    prisma.interviewSession.findMany.mockResolvedValue([{ id: 's1' }]);
    await repository.countSessions('u1');
    await repository.listSessions('u1', 2, 10);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, skip: 10, take: 10 }),
    );
  });

  describe('findProblemById', () => {
    it('maps a problem with its hidden test cases', async () => {
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p1',
        title: 'Two Sum',
        difficulty: 'easy',
        topics: ['array'],
        statement: 'stmt',
        timeLimitMs: 1000,
        memoryLimitMb: 256,
        testCases: [{ input: '1\n', expectedOutput: '2\n' }],
      });
      const result = await repository.findProblemById('p1');
      expect(result?.hiddenTestCases).toEqual([{ stdin: '1\n', expectedOutput: '2\n' }]);
      expect(prisma.problem.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            testCases: {
              where: { isSample: false },
              orderBy: { order: 'asc' },
              select: { input: true, expectedOutput: true },
            },
          }),
        }),
      );
    });

    it('returns null for a missing problem', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);
      expect(await repository.findProblemById('nope')).toBeNull();
    });
  });

  it('lists the top skill profile rows', async () => {
    prisma.skillProfile.findMany.mockResolvedValue([{ name: 'React' }]);
    const result = await repository.findSkillProfile('u1', 5);
    expect(result).toEqual([{ name: 'React' }]);
    expect(prisma.skillProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, take: 5 }),
    );
  });

  describe('addTurnPair', () => {
    it('persists user turn, ai turn and feedback atomically', async () => {
      prisma.interviewTurn.count.mockResolvedValue(2);
      prisma.interviewTurn.create
        .mockResolvedValueOnce({ id: 'ut1' })
        .mockResolvedValueOnce({ id: 'at1' });
      prisma.interviewFeedback.createMany.mockResolvedValue({ count: 1 });

      const result = await repository.addTurnPair(
        's1',
        { role: 'user', content: 'a', judgeVerdict: 'accepted' },
        { role: 'ai', content: 'q' },
        [{ skill: 'x', score: 5, comment: 'c' }],
      );

      expect(prisma.interviewTurn.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ order: 2, role: 'user', judgeVerdict: 'accepted' }),
        }),
      );
      expect(prisma.interviewTurn.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: expect.objectContaining({ order: 3, role: 'ai' }) }),
      );
      expect(prisma.interviewFeedback.createMany).toHaveBeenCalledWith({
        data: [{ sessionId: 's1', turnId: 'ut1', skill: 'x', score: 5, comment: 'c' }],
      });
      expect(result).toEqual({ userTurnId: 'ut1', aiTurnId: 'at1' });
    });

    it('skips feedback when none is provided', async () => {
      prisma.interviewTurn.count.mockResolvedValue(0);
      prisma.interviewTurn.create
        .mockResolvedValueOnce({ id: 'ut1' })
        .mockResolvedValueOnce({ id: 'at1' });
      await repository.addTurnPair(
        's1',
        { role: 'user', content: 'a' },
        { role: 'ai', content: 'q' },
        [],
      );
      expect(prisma.interviewFeedback.createMany).not.toHaveBeenCalled();
    });
  });

  it('creates the first ai turn', async () => {
    await repository.createFirstAiTurn('s1', 'Opening');
    expect(prisma.interviewTurn.create).toHaveBeenCalledWith({
      data: { sessionId: 's1', role: 'ai', content: 'Opening', order: 0 },
    });
  });

  it('marks a session started only when created', async () => {
    await repository.markStarted('s1', new Date());
    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', status: 'created' } }),
    );
  });

  it('ends a session that is not already ended', async () => {
    await repository.endSession('s1', new Date());
    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', status: { not: 'ended' } } }),
    );
  });

  describe('createReport', () => {
    it('persists a report with topic scores', async () => {
      prisma.interviewReport.create.mockResolvedValue({ id: 'r1' });
      await repository.createReport({
        sessionId: 's1',
        overallScore: 80,
        summary: 'ok',
        strengths: ['a'],
        improvements: ['b'],
        suggestions: ['c'],
        topicScores: { communication: 90 },
      });
      expect(prisma.interviewReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ topicScores: { communication: 90 } }),
        }),
      );
    });

    it('persists a null topicScores as JsonNull', async () => {
      prisma.interviewReport.create.mockResolvedValue({ id: 'r1' });
      await repository.createReport({
        sessionId: 's1',
        overallScore: 80,
        summary: 'ok',
        strengths: [],
        improvements: [],
        suggestions: [],
        topicScores: null,
      });
      const data = prisma.interviewReport.create.mock.calls[0][0].data;
      expect(data.topicScores).toBe(Prisma.JsonNull);
    });
  });

  it('finds a report', async () => {
    prisma.interviewReport.findUnique.mockResolvedValue({ id: 'r1' });
    await repository.findReport('s1');
    expect(prisma.interviewReport.findUnique).toHaveBeenCalledWith({ where: { sessionId: 's1' } });
  });
});
