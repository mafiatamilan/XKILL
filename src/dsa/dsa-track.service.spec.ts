import { NotFoundException } from '@nestjs/common';
import { DsaRepository } from './dsa.repository';
import { DsaTrackService } from './dsa-track.service';

describe('DsaTrackService', () => {
  const repository = {
    createPlaylist: jest.fn(),
    findPlaylistsByUser: jest.fn(),
    countPlaylistsByUser: jest.fn(),
    findPlaylistById: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
    addPlaylistProblem: jest.fn(),
    removePlaylistProblem: jest.fn(),
    findActiveSheets: jest.fn(),
    findSheetById: jest.fn(),
    findSolvedProblems: jest.fn(),
    findSolvedProblemIds: jest.fn(),
    findSubmissionsForAnalytics: jest.fn(),
    findVisibility: jest.fn(),
    upsertVisibility: jest.fn(),
    createDiscussion: jest.fn(),
    findDiscussions: jest.fn(),
    countDiscussions: jest.fn(),
    findDiscussionById: jest.fn(),
    upvoteDiscussion: jest.fn(),
    findProblemById: jest.fn(),
  };
  let service: DsaTrackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DsaTrackService(repository as unknown as DsaRepository);
  });

  const playlist = (overrides: Record<string, unknown> = {}) => ({
    id: 'pl1',
    userId: 'u1',
    title: 'Prep',
    description: null,
    isPublic: false,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    problems: [],
    ...overrides,
  });

  describe('createPlaylist', () => {
    it('defaults a playlist to private', async () => {
      repository.createPlaylist.mockResolvedValue(playlist());
      const result = await service.createPlaylist('u1', {
        title: 'Prep',
        description: 'desc',
      });
      expect(repository.createPlaylist).toHaveBeenCalledWith('u1', {
        title: 'Prep',
        description: 'desc',
        isPublic: false,
      });
      expect(result.isPublic).toBe(false);
      expect(result.problemCount).toBe(0);
    });
  });

  describe('listMyPlaylists', () => {
    it('returns a paginated envelope', async () => {
      repository.findPlaylistsByUser.mockResolvedValue([playlist()]);
      repository.countPlaylistsByUser.mockResolvedValue(1);
      const result = await service.listMyPlaylists('u1', 1, 10);
      expect(repository.findPlaylistsByUser).toHaveBeenCalledWith('u1', 1, 10);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
      expect(result.data[0].problemCount).toBe(0);
    });
  });

  describe('getPlaylist', () => {
    it('returns my private playlist with its problems', async () => {
      repository.findPlaylistById.mockResolvedValue(
        playlist({
          problems: [
            {
              order: 1,
              problem: { id: 'p1', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy' },
            },
          ],
        }),
      );
      const result = await service.getPlaylist('u1', 'pl1');
      expect(result.problems[0].id).toBe('p1');
      expect(result.problems[0].order).toBe(1);
    });

    it('returns 404 for another user private playlist (no existence leak)', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist({ userId: 'owner' }));
      await expect(service.getPlaylist('u1', 'pl1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets anyone read a shared playlist', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist({ userId: 'owner', isPublic: true }));
      const result = await service.getPlaylist('u1', 'pl1');
      expect(result.title).toBe('Prep');
    });

    it('returns 404 for an unknown playlist', async () => {
      repository.findPlaylistById.mockResolvedValue(null);
      await expect(service.getPlaylist('u1', 'pl1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update/delete playlist', () => {
    it('updates only the owned playlist', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist());
      repository.updatePlaylist.mockResolvedValue(playlist({ title: 'Renamed' }));
      const result = await service.updatePlaylist('u1', 'pl1', { title: 'Renamed' });
      expect(repository.updatePlaylist).toHaveBeenCalledWith('pl1', {
        title: 'Renamed',
        description: undefined,
        isPublic: undefined,
      });
      expect(result.title).toBe('Renamed');
    });

    it('404s when updating someone else playlist', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist({ userId: 'owner' }));
      await expect(service.updatePlaylist('u1', 'pl1', { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes only the owned playlist', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist());
      const result = await service.deletePlaylist('u1', 'pl1');
      expect(repository.deletePlaylist).toHaveBeenCalledWith('pl1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('playlist problems', () => {
    it('adds a problem when the user owns the playlist and the problem exists', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist());
      repository.findProblemById.mockResolvedValue({ id: 'p1' });
      const result = await service.addProblemToPlaylist('u1', 'pl1', 'p1');
      expect(repository.addPlaylistProblem).toHaveBeenCalledWith('pl1', 'p1');
      expect(result.added).toBe(true);
    });

    it('404s when the problem does not exist', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist());
      repository.findProblemById.mockResolvedValue(null);
      await expect(service.addProblemToPlaylist('u1', 'pl1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes a problem', async () => {
      repository.findPlaylistById.mockResolvedValue(playlist());
      repository.removePlaylistProblem.mockResolvedValue({ count: 1 });
      const result = await service.removeProblemFromPlaylist('u1', 'pl1', 'p1');
      expect(repository.removePlaylistProblem).toHaveBeenCalledWith('pl1', 'p1');
      expect(result.removed).toBe(true);
    });
  });

  describe('sheets', () => {
    it('lists active sheets with live per-sheet progress', async () => {
      repository.findActiveSheets.mockResolvedValue([
        {
          id: 'sh1',
          slug: 'blind-75',
          name: 'Blind 75',
          description: null,
          problems: [{ problemId: 'p1' }, { problemId: 'p2' }, { problemId: 'p3' }],
        },
      ]);
      repository.findSolvedProblemIds.mockResolvedValue(['p1', 'p3']);
      const result = await service.listSheets('u1');
      expect(result.data[0]).toMatchObject({
        id: 'sh1',
        totalProblems: 3,
        solvedProblems: 2,
        progressPercent: 66.7,
      });
    });

    it('returns 404 for unknown or inactive sheets', async () => {
      repository.findSheetById.mockResolvedValue(null);
      await expect(service.getSheet('u1', 'sh1')).rejects.toBeInstanceOf(NotFoundException);
      repository.findSheetById.mockResolvedValue({ isActive: false, problems: [] });
      await expect(service.getSheet('u1', 'sh1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns per-problem completion for the current user', async () => {
      repository.findSheetById.mockResolvedValue({
        id: 'sh1',
        slug: 'blind-75',
        name: 'Blind 75',
        description: null,
        isActive: true,
        problems: [
          {
            order: 1,
            problem: {
              id: 'p1',
              slug: 'two-sum',
              title: 'Two Sum',
              difficulty: 'easy',
              topics: ['array'],
              companies: ['Google'],
            },
          },
          {
            order: 2,
            problem: {
              id: 'p2',
              slug: 'valid-parentheses',
              title: 'Valid Parentheses',
              difficulty: 'easy',
              topics: ['stack'],
              companies: ['Amazon'],
            },
          },
        ],
      });
      repository.findSolvedProblemIds.mockResolvedValue(['p1']);
      const result = await service.getSheet('u1', 'sh1');
      expect(result.solvedProblems).toBe(1);
      expect(result.progressPercent).toBe(50);
      expect(result.problems.find((p: { id: string }) => p.id === 'p1')!.solved).toBe(true);
      expect(result.problems.find((p: { id: string }) => p.id === 'p2')!.solved).toBe(false);
    });
  });

  describe('progress/analytics', () => {
    it('computes progress from live solved rows', async () => {
      repository.findSolvedProblems.mockResolvedValue([
        {
          firstSolvedAt: new Date('2026-07-10T08:00:00Z'),
          problem: { difficulty: 'easy', topics: ['array'], companies: ['Google'] },
        },
        {
          firstSolvedAt: new Date('2026-07-11T08:00:00Z'),
          problem: { difficulty: 'medium', topics: ['dp'], companies: ['Amazon'] },
        },
      ]);
      const result = await service.getMyProgress('u1');
      expect(result.totalSolved).toBe(2);
      expect(result.byDifficulty).toEqual({ easy: 1, medium: 1, hard: 0 });
    });

    it('computes analytics from live submissions with the rating placeholder', async () => {
      repository.findSubmissionsForAnalytics.mockResolvedValue([
        {
          verdict: 'accepted',
          timeMs: 10,
          problemId: 'p1',
          submittedAt: new Date('2026-07-30T08:00:00Z'),
          problem: { topics: ['array'] },
        },
      ]);
      const result = await service.getMyAnalytics('u1');
      expect(result.accuracy).toBe(100);
      expect(result.averageRuntimeMs).toBe(10);
      expect(result.ratingTrend.available).toBe(false);
      expect(result.ratingTrend.message).toContain('5.5c');
    });
  });

  describe('visibility', () => {
    it('returns defaults when no settings row exists', async () => {
      repository.findVisibility.mockResolvedValue(null);
      const result = await service.getVisibility('u1');
      expect(result.showEmail).toBe(false);
      expect(result.showFullName).toBe(true);
      expect(result.userId).toBe('u1');
    });

    it('persists only the provided toggles', async () => {
      repository.findVisibility.mockResolvedValue(null);
      repository.upsertVisibility.mockImplementation(
        (userId: string, changes: Record<string, boolean>) =>
          Promise.resolve({ userId, ...changes }),
      );
      const result = await service.updateVisibility('u1', { showEmail: true });
      expect(repository.upsertVisibility).toHaveBeenCalledWith('u1', { showEmail: true });
      expect(result.showEmail).toBe(true);
      expect(result.showRating).toBe(true);
    });
  });

  describe('discussion', () => {
    it('lists posts with author and per-user upvoted flag', async () => {
      repository.findProblemById.mockResolvedValue({ id: 'p1' });
      repository.findDiscussions.mockResolvedValue([
        {
          id: 'd1',
          title: 't',
          body: 'b',
          upvoteCount: 3,
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-01T00:00:00Z'),
          author: { id: 'author-1', fullName: 'Ada' },
          votes: [{ id: 'v1' }],
        },
      ]);
      repository.countDiscussions.mockResolvedValue(1);
      const result = await service.listDiscussions('u1', 'p1', 1, 10);
      expect(result.data[0].author?.fullName).toBe('Ada');
      expect(result.data[0].upvoted).toBe(true);
      expect(result.data[0].upvoteCount).toBe(3);
    });

    it('404s listing discussion for an unknown problem', async () => {
      repository.findProblemById.mockResolvedValue(null);
      await expect(service.listDiscussions('u1', 'nope', 1, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates a post scoped to the problem and author', async () => {
      repository.findProblemById.mockResolvedValue({ id: 'p1' });
      repository.createDiscussion.mockResolvedValue({
        id: 'd1',
        problemId: 'p1',
        title: 't',
        body: 'b',
        upvoteCount: 0,
        createdAt: new Date('2026-07-01T00:00:00Z'),
      });
      const result = await service.createDiscussion('u1', 'p1', { title: 't', body: 'b' });
      expect(repository.createDiscussion).toHaveBeenCalledWith({
        problemId: 'p1',
        authorId: 'u1',
        title: 't',
        body: 'b',
      });
      expect(result.id).toBe('d1');
    });

    it('upvotes a post and reports the new count', async () => {
      repository.findDiscussionById.mockResolvedValue({ id: 'd1' });
      repository.upvoteDiscussion.mockResolvedValue({
        created: true,
        discussion: { id: 'd1', upvoteCount: 4 },
      });
      const result = await service.upvoteDiscussion('u1', 'd1');
      expect(result).toEqual({ id: 'd1', upvoteCount: 4, upvoted: true });
    });

    it('404s upvoting an unknown post', async () => {
      repository.findDiscussionById.mockResolvedValue(null);
      await expect(service.upvoteDiscussion('u1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
