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
    playlist: Record<string, jest.Mock>;
    playlistProblem: Record<string, jest.Mock>;
    sheet: Record<string, jest.Mock>;
    sheetProblem: Record<string, jest.Mock>;
    discussion: Record<string, jest.Mock>;
    discussionVote: Record<string, jest.Mock>;
    dsaProfileVisibility: Record<string, jest.Mock>;
    $transaction: jest.Mock;
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
            solvedProblem: {
              upsert: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            playlist: {
              count: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            playlistProblem: { count: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
            sheet: { findMany: jest.fn(), findUnique: jest.fn() },
            sheetProblem: {},
            discussion: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            discussionVote: { create: jest.fn(), findUnique: jest.fn() },
            dsaProfileVisibility: { findUnique: jest.fn(), upsert: jest.fn() },
            $transaction: jest.fn(),
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

  describe('playlists', () => {
    it('lists and counts a users playlists', async () => {
      prisma.playlist.findMany.mockResolvedValue([{ id: 'pl1' }]);
      prisma.playlist.count.mockResolvedValue(1);
      await repository.findPlaylistsByUser('u1', 1, 10);
      expect(prisma.playlist.findMany.mock.calls[0][0]).toMatchObject({
        where: { userId: 'u1' },
        skip: 0,
        take: 10,
      });
      await expect(repository.countPlaylistsByUser('u1')).resolves.toBe(1);
    });

    it('creates and updates a playlist', async () => {
      prisma.playlist.create.mockResolvedValue({ id: 'pl1' });
      const created = await repository.createPlaylist('u1', { title: 'Prep' });
      expect(prisma.playlist.create).toHaveBeenCalledWith({
        data: { userId: 'u1', title: 'Prep' },
      });
      await repository.updatePlaylist('pl1', { isPublic: true });
      expect(prisma.playlist.update).toHaveBeenCalledWith({
        where: { id: 'pl1' },
        data: { isPublic: true },
      });
      expect(created.id).toBe('pl1');
    });

    it('adds a problem idempotently with an appended order', async () => {
      prisma.playlistProblem.count.mockResolvedValue(2);
      prisma.playlistProblem.upsert.mockResolvedValue({ id: 'pp1' });
      await repository.addPlaylistProblem('pl1', 'p1');
      expect(prisma.playlistProblem.upsert).toHaveBeenCalledWith({
        where: { playlistId_problemId: { playlistId: 'pl1', problemId: 'p1' } },
        update: {},
        create: { playlistId: 'pl1', problemId: 'p1', order: 3 },
      });
    });

    it('removes a problem from a playlist', async () => {
      prisma.playlistProblem.deleteMany.mockResolvedValue({ count: 1 });
      await repository.removePlaylistProblem('pl1', 'p1');
      expect(prisma.playlistProblem.deleteMany).toHaveBeenCalledWith({
        where: { playlistId: 'pl1', problemId: 'p1' },
      });
    });
  });

  describe('sheets', () => {
    it('lists active sheets with ordered problem ids', async () => {
      prisma.sheet.findMany.mockResolvedValue([{ id: 'sh1', problems: [{ problemId: 'p1' }] }]);
      const result = await repository.findActiveSheets();
      expect(prisma.sheet.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
      expect(result[0].problems[0].problemId).toBe('p1');
    });

    it('finds a sheet by id including problems', async () => {
      prisma.sheet.findUnique.mockResolvedValue({ id: 'sh1', problems: [] });
      const result = await repository.findSheetById('sh1');
      expect(prisma.sheet.findUnique).toHaveBeenCalledWith({
        where: { id: 'sh1' },
        include: expect.objectContaining({ problems: expect.anything() }),
      });
      expect(result?.id).toBe('sh1');
    });
  });

  describe('live solved state', () => {
    it('loads solved problems with their difficulty/topic/company', async () => {
      prisma.solvedProblem.findMany.mockResolvedValue([
        { problem: { difficulty: 'easy', topics: ['array'], companies: ['Google'] } },
      ]);
      const result = await repository.findSolvedProblems('u1');
      expect(result[0].problem.difficulty).toBe('easy');
    });

    it('loads solved problem ids for progress intersection', async () => {
      prisma.solvedProblem.findMany.mockResolvedValue([{ problemId: 'p1' }, { problemId: 'p2' }]);
      const ids = await repository.findSolvedProblemIds('u1');
      expect(ids).toEqual(['p1', 'p2']);
    });
  });

  describe('analytics submissions', () => {
    it('loads submissions with problem topics', async () => {
      prisma.submission.findMany.mockResolvedValue([
        { verdict: 'accepted', problem: { topics: ['array'] } },
      ]);
      const result = await repository.findSubmissionsForAnalytics('u1');
      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        select: expect.objectContaining({ problem: { select: { topics: true } } }),
      });
      expect(result[0].problem.topics).toEqual(['array']);
    });
  });

  describe('visibility', () => {
    it('finds and upserts the settings row', async () => {
      prisma.dsaProfileVisibility.findUnique.mockResolvedValue(null);
      prisma.dsaProfileVisibility.upsert.mockResolvedValue({ userId: 'u1', showEmail: true });
      await repository.findVisibility('u1');
      expect(prisma.dsaProfileVisibility.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      const result = await repository.upsertVisibility('u1', { showEmail: true });
      expect(prisma.dsaProfileVisibility.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        update: { showEmail: true },
        create: { userId: 'u1', showEmail: true },
      });
      expect(result.showEmail).toBe(true);
    });
  });

  describe('discussion', () => {
    it('creates a post and lists them with per-user votes', async () => {
      prisma.discussion.create.mockResolvedValue({ id: 'd1' });
      const created = await repository.createDiscussion({
        problemId: 'p1',
        authorId: 'u1',
        title: 't',
        body: 'b',
      });
      expect(created.id).toBe('d1');

      prisma.discussion.findMany.mockResolvedValue([{ id: 'd1', votes: [{ id: 'v1' }] }]);
      prisma.discussion.count.mockResolvedValue(1);
      const list = await repository.findDiscussions('p1', 'u1', 1, 10);
      expect(prisma.discussion.findMany.mock.calls[0][0]).toMatchObject({
        where: { problemId: 'p1' },
        skip: 0,
        take: 10,
      });
      expect(list[0].votes).toHaveLength(1);
    });

    it('upvotes a post once per user within a transaction', async () => {
      const tx = {
        discussionVote: { findUnique: jest.fn(), create: jest.fn() },
        discussion: { findUnique: jest.fn(), update: jest.fn() },
      };
      tx.discussionVote.findUnique.mockResolvedValue(null);
      tx.discussion.update.mockResolvedValue({ id: 'd1', upvoteCount: 1 });
      prisma.$transaction.mockImplementation((callback: (t: unknown) => unknown) => callback(tx));

      const result = await repository.upvoteDiscussion('d1', 'u1');
      expect(tx.discussionVote.create).toHaveBeenCalledWith({
        data: { discussionId: 'd1', userId: 'u1' },
      });
      expect(tx.discussion.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { upvoteCount: { increment: 1 } },
      });
      expect(result).toEqual({ created: true, discussion: { id: 'd1', upvoteCount: 1 } });
    });

    it('does not double-count an existing vote', async () => {
      const tx = {
        discussionVote: { findUnique: jest.fn(), create: jest.fn() },
        discussion: { findUnique: jest.fn(), update: jest.fn() },
      };
      tx.discussionVote.findUnique.mockResolvedValue({ id: 'v1' });
      tx.discussion.findUnique.mockResolvedValue({ id: 'd1', upvoteCount: 2 });
      prisma.$transaction.mockImplementation((callback: (t: unknown) => unknown) => callback(tx));

      const result = await repository.upvoteDiscussion('d1', 'u1');
      expect(tx.discussionVote.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        created: false,
        discussion: { id: 'd1', upvoteCount: 2 },
      });
    });
  });
});
