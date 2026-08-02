import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DsaRepository } from './dsa.repository';

describe('DsaRepository', () => {
  let repository: DsaRepository;
  let prisma: {
    problem: Record<string, jest.Mock>;
    testCase: Record<string, jest.Mock>;
    editorial: Record<string, jest.Mock>;
    hint: Record<string, jest.Mock>;
    hintUnlock: Record<string, jest.Mock>;
    submission: Record<string, jest.Mock>;
    solvedProblem: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DsaRepository,
        {
          provide: PrismaService,
          useValue: {
            problem: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
            testCase: { findMany: jest.fn() },
            editorial: { findUnique: jest.fn() },
            hint: { findMany: jest.fn() },
            hintUnlock: { findUnique: jest.fn(), upsert: jest.fn() },
            submission: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            solvedProblem: { upsert: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    repository = module.get(DsaRepository);
    prisma = module.get(PrismaService);
  });

  describe('problems', () => {
    it('counts and lists problems with filters applied', async () => {
      prisma.problem.count.mockResolvedValue(3);
      prisma.problem.findMany.mockResolvedValue([{ id: 'p1' }]);

      await repository.countProblems({ difficulty: 'easy', topic: 'dp' });
      await repository.findProblems(
        { difficulty: 'easy', topic: 'dp' },
        1,
        10,
        'createdAt',
        'desc',
      );

      expect(prisma.problem.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ isActive: true, difficulty: 'easy' }),
      });
      const findArgs = prisma.problem.findMany.mock.calls[0][0];
      expect(findArgs.where.topics).toEqual({ has: 'dp' });
      expect(findArgs.skip).toBe(0);
      expect(findArgs.take).toBe(10);
    });

    it('uses the GIN containment filter for company and tag', async () => {
      await repository.countProblems({ company: 'Google', tag: 'two-pointers' });
      const where = prisma.problem.count.mock.calls[0][0].where;
      expect(where.companies).toEqual({ has: 'Google' });
      expect(where.tags).toEqual({ has: 'two-pointers' });
    });

    it('falls back to createdAt ordering for unknown sort fields', async () => {
      prisma.problem.findMany.mockResolvedValue([]);
      await repository.findProblems({}, 1, 10, 'not-a-field', 'asc');
      expect(prisma.problem.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  describe('test cases', () => {
    it('returns only sample test cases for problem view', async () => {
      prisma.testCase.findMany.mockResolvedValue([{ input: '1' }]);
      await repository.findSampleTestCases('p1');
      expect(prisma.testCase.findMany).toHaveBeenCalledWith({
        where: { problemId: 'p1', isSample: true },
        orderBy: { order: 'asc' },
      });
    });

    it('maps hidden test cases into stdin shape for the judge', async () => {
      prisma.testCase.findMany.mockResolvedValue([{ input: '2\n', expectedOutput: '3\n' }]);
      const result = await repository.findHiddenTestCases('p1');
      expect(result).toEqual([{ stdin: '2\n', expectedOutput: '3\n' }]);
      expect(prisma.testCase.findMany).toHaveBeenCalledWith({
        where: { problemId: 'p1', isSample: false },
        orderBy: { order: 'asc' },
        select: { input: true, expectedOutput: true },
      });
    });
  });

  describe('hints', () => {
    it('finds and upserts the per-user hint unlock state', async () => {
      prisma.hintUnlock.findUnique.mockResolvedValue({ unlockedHints: 1 });
      prisma.hintUnlock.upsert.mockResolvedValue({ unlockedHints: 2 });

      await repository.findHintUnlock('u1', 'p1');
      await repository.upsertHintUnlock('u1', 'p1', 2);

      expect(prisma.hintUnlock.findUnique).toHaveBeenCalledWith({
        where: { userId_problemId: { userId: 'u1', problemId: 'p1' } },
      });
      expect(prisma.hintUnlock.upsert).toHaveBeenCalledWith({
        where: { userId_problemId: { userId: 'u1', problemId: 'p1' } },
        update: { unlockedHints: 2 },
        create: { userId: 'u1', problemId: 'p1', unlockedHints: 2 },
      });
    });
  });

  describe('submissions', () => {
    it('creates a submission row', async () => {
      prisma.submission.create.mockResolvedValue({ id: 's1' });
      const result = await repository.createSubmission({
        userId: 'u1',
        problemId: 'p1',
        languageId: 71,
        sourceCode: 'print(1)',
      });
      expect(result.id).toBe('s1');
      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: { userId: 'u1', problemId: 'p1', languageId: 71, sourceCode: 'print(1)' },
      });
    });

    it('lists and counts my submissions with problem/verdict filters', async () => {
      prisma.submission.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.submission.count.mockResolvedValue(5);

      await repository.findSubmissions('u1', 'p1', 'accepted', 2, 20);
      await repository.countSubmissions('u1', 'p1', 'accepted');

      expect(prisma.submission.findMany.mock.calls[0][0]).toMatchObject({
        where: { userId: 'u1', problemId: 'p1', verdict: 'accepted' },
        skip: 20,
        take: 20,
      });
      expect(prisma.submission.count).toHaveBeenCalledWith({
        where: { userId: 'u1', problemId: 'p1', verdict: 'accepted' },
      });
    });
  });

  describe('solved problems', () => {
    it('marks a problem solved via idempotent upsert on the unique pair', async () => {
      prisma.solvedProblem.upsert.mockResolvedValue({ id: 'solved-1' });
      const result = await repository.markSolved('u1', 'p1');
      expect(prisma.solvedProblem.upsert).toHaveBeenCalledWith({
        where: { userId_problemId: { userId: 'u1', problemId: 'p1' } },
        update: {},
        create: { userId: 'u1', problemId: 'p1' },
      });
      expect(result.id).toBe('solved-1');
    });

    it('counts distinct solved problems', async () => {
      prisma.solvedProblem.count.mockResolvedValue(4);
      await expect(repository.countSolved('u1')).resolves.toBe(4);
    });
  });
});
