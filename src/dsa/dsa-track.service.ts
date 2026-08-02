import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import { DsaRepository } from './dsa.repository';
import { computeAnalytics } from './calculators/analytics.calculator';
import { computeProgress } from './calculators/progress.calculator';
import { DEFAULT_VISIBILITY, DsaVisibilitySettings } from './calculators/profile-visibility';
import {
  CreateDiscussionDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  UpdateVisibilityDto,
} from './dto/dsa-track.dto';

const PLAYLIST_NOT_FOUND = { code: 'PLAYLIST_NOT_FOUND', message: 'Playlist not found' };

@Injectable()
export class DsaTrackService {
  constructor(private readonly repository: DsaRepository) {}

  // ---- Playlists ----

  async createPlaylist(userId: string, dto: CreatePlaylistDto) {
    const playlist = await this.repository.createPlaylist(userId, {
      title: dto.title,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
    });
    return this.mapPlaylistSummary(playlist);
  }

  async listMyPlaylists(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repository.findPlaylistsByUser(userId, page, limit),
      this.repository.countPlaylistsByUser(userId),
    ]);
    return {
      data: data.map((playlist) => this.mapPlaylistSummary(playlist)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getPlaylist(userId: string, playlistId: string) {
    const playlist = await this.repository.findPlaylistById(playlistId);
    if (!playlist || (!playlist.isPublic && playlist.userId !== userId)) {
      // 404 (not 403) for private playlists of other users — no existence leak.
      throw new NotFoundException(PLAYLIST_NOT_FOUND);
    }
    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      problems: playlist.problems.map((entry) => ({
        id: entry.problem.id,
        slug: entry.problem.slug,
        title: entry.problem.title,
        difficulty: entry.problem.difficulty,
        order: entry.order,
      })),
    };
  }

  async updatePlaylist(userId: string, playlistId: string, dto: UpdatePlaylistDto) {
    await this.ensureOwnedPlaylist(userId, playlistId);
    const playlist = await this.repository.updatePlaylist(playlistId, {
      title: dto.title,
      description: dto.description,
      isPublic: dto.isPublic,
    });
    return this.mapPlaylistSummary(playlist);
  }

  async deletePlaylist(userId: string, playlistId: string) {
    await this.ensureOwnedPlaylist(userId, playlistId);
    await this.repository.deletePlaylist(playlistId);
    return { id: playlistId, deleted: true };
  }

  async addProblemToPlaylist(userId: string, playlistId: string, problemId: string) {
    await this.ensureOwnedPlaylist(userId, playlistId);
    await this.ensureProblem(problemId);
    await this.repository.addPlaylistProblem(playlistId, problemId);
    return { playlistId, problemId, added: true };
  }

  async removeProblemFromPlaylist(userId: string, playlistId: string, problemId: string) {
    await this.ensureOwnedPlaylist(userId, playlistId);
    await this.repository.removePlaylistProblem(playlistId, problemId);
    return { playlistId, problemId, removed: true };
  }

  // ---- Sheets ----

  async listSheets(userId: string) {
    const [sheets, solvedIds] = await Promise.all([
      this.repository.findActiveSheets(),
      this.repository.findSolvedProblemIds(userId),
    ]);
    const solved = new Set(solvedIds);
    return {
      data: sheets.map((sheet) => {
        const totalProblems = sheet.problems.length;
        const solvedProblems = sheet.problems.filter((entry) => solved.has(entry.problemId)).length;
        return {
          id: sheet.id,
          slug: sheet.slug,
          name: sheet.name,
          description: sheet.description,
          totalProblems,
          solvedProblems,
          progressPercent: sheetProgressPercent(solvedProblems, totalProblems),
        };
      }),
    };
  }

  async getSheet(userId: string, sheetId: string) {
    const [sheet, solvedIds] = await Promise.all([
      this.repository.findSheetById(sheetId),
      this.repository.findSolvedProblemIds(userId),
    ]);
    if (!sheet || !sheet.isActive) {
      throw new NotFoundException({ code: 'SHEET_NOT_FOUND', message: 'Sheet not found' });
    }
    const solved = new Set(solvedIds);
    const problems = sheet.problems.map((entry) => ({
      id: entry.problem.id,
      slug: entry.problem.slug,
      title: entry.problem.title,
      difficulty: entry.problem.difficulty,
      topics: entry.problem.topics,
      companies: entry.problem.companies,
      order: entry.order,
      solved: solved.has(entry.problem.id),
    }));
    const totalProblems = problems.length;
    const solvedProblems = problems.filter((problem) => problem.solved).length;
    return {
      id: sheet.id,
      slug: sheet.slug,
      name: sheet.name,
      description: sheet.description,
      totalProblems,
      solvedProblems,
      progressPercent: sheetProgressPercent(solvedProblems, totalProblems),
      problems,
    };
  }

  // ---- Progress & analytics (live-computed, no cached aggregates) ----

  async getMyProgress(userId: string) {
    const solvedProblems = await this.repository.findSolvedProblems(userId);
    return computeProgress({
      solvedProblems: solvedProblems.map((row) => ({
        difficulty: row.problem.difficulty,
        topics: row.problem.topics,
        companies: row.problem.companies,
        firstSolvedAt: row.firstSolvedAt,
      })),
    });
  }

  async getMyAnalytics(userId: string) {
    const submissions = await this.repository.findSubmissionsForAnalytics(userId);
    return computeAnalytics({
      submissions: submissions.map((row) => ({
        verdict: row.verdict,
        timeMs: row.timeMs,
        problemId: row.problemId,
        topics: row.problem.topics,
        submittedAt: row.submittedAt,
      })),
    });
  }

  // ---- Recruiter-visibility settings ----

  async getVisibility(userId: string) {
    const row = await this.repository.findVisibility(userId);
    return { userId, ...DEFAULT_VISIBILITY, ...(row ? pickVisibility(row) : {}) };
  }

  async updateVisibility(userId: string, dto: UpdateVisibilityDto) {
    const changes = pickVisibility(dto);
    const row = await this.repository.upsertVisibility(userId, changes);
    return { userId, ...DEFAULT_VISIBILITY, ...pickVisibility(row) };
  }

  // ---- Discussion ----

  async listDiscussions(userId: string, problemId: string, page: number, limit: number) {
    await this.ensureProblem(problemId);
    const [data, total] = await Promise.all([
      this.repository.findDiscussions(problemId, userId, page, limit),
      this.repository.countDiscussions(problemId),
    ]);
    return {
      data: data.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        author: post.author ? { id: post.author.id, fullName: post.author.fullName } : undefined,
        upvoteCount: post.upvoteCount,
        upvoted: post.votes.length > 0,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createDiscussion(userId: string, problemId: string, dto: CreateDiscussionDto) {
    await this.ensureProblem(problemId);
    const post = await this.repository.createDiscussion({
      problemId,
      authorId: userId,
      title: dto.title,
      body: dto.body,
    });
    return {
      id: post.id,
      problemId: post.problemId,
      title: post.title,
      body: post.body,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
    };
  }

  async upvoteDiscussion(userId: string, discussionId: string) {
    const existing = await this.repository.findDiscussionById(discussionId);
    if (!existing) {
      throw new NotFoundException({
        code: 'DISCUSSION_NOT_FOUND',
        message: 'Discussion post not found',
      });
    }
    const { discussion } = await this.repository.upvoteDiscussion(discussionId, userId);
    if (!discussion) {
      throw new NotFoundException({
        code: 'DISCUSSION_NOT_FOUND',
        message: 'Discussion post not found',
      });
    }
    return {
      id: discussion.id,
      upvoteCount: discussion.upvoteCount,
      upvoted: true,
    };
  }

  // ---- Helpers ----

  private async ensureProblem(problemId: string): Promise<void> {
    const problem = await this.repository.findProblemById(problemId);
    if (!problem) {
      throw new NotFoundException({ code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' });
    }
  }

  private async ensureOwnedPlaylist(userId: string, playlistId: string) {
    const playlist = await this.repository.findPlaylistById(playlistId);
    if (!playlist || playlist.userId !== userId) {
      throw new NotFoundException(PLAYLIST_NOT_FOUND);
    }
  }

  private mapPlaylistSummary(playlist: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    problems?: Array<{ problemId: string }>;
  }) {
    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      isPublic: playlist.isPublic,
      problemCount: playlist.problems?.length ?? 0,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
    };
  }
}

function sheetProgressPercent(solved: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((solved / total) * 1000) / 10;
}

const VISIBILITY_KEYS = [
  'showFullName',
  'showEmail',
  'showCollege',
  'showSkills',
  'showSolvedCount',
  'showTopics',
  'showStreak',
  'showRating',
] as const;

function pickVisibility(
  row: Partial<Pick<DsaVisibilitySettings, (typeof VISIBILITY_KEYS)[number]>>,
): Partial<DsaVisibilitySettings> {
  const changes: Partial<DsaVisibilitySettings> = {};
  for (const key of VISIBILITY_KEYS) {
    if (typeof row[key] === 'boolean') {
      changes[key] = row[key];
    }
  }
  return changes;
}
