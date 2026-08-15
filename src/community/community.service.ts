import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CommunityRepository } from './community.repository';

@Injectable()
export class CommunityService {
  constructor(private readonly repository: CommunityRepository) {}

  // ── Forum Posts ──

  async createForumPost(userId: string, dto: { title: string; body: string; tags?: string[] }) {
    const post = await this.repository.createForumPost({
      authorId: userId,
      title: dto.title,
      body: dto.body,
      tags: dto.tags,
    });
    return this.formatPost(post, post.author.fullName);
  }

  async getForumPost(id: string, _userId?: string) {
    const post = await this.repository.findForumPostById(id);
    if (!post) throw new NotFoundException('Forum post not found');
    await this.repository.incrementPostViews(id);
    const updated = await this.repository.findForumPostById(id);
    return this.formatPost(updated!, updated!.author.fullName);
  }

  async listForumPosts(page = 1, limit = 20, tag?: string) {
    const skip = (page - 1) * limit;
    const { posts, total } = await this.repository.listForumPosts({ skip, take: limit, tag });
    return {
      data: posts.map((p) => this.formatPost(p, p.author.fullName)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateForumPost(
    id: string,
    userId: string,
    dto: { title?: string; body?: string; tags?: string[]; isPinned?: boolean; isLocked?: boolean },
  ) {
    const post = await this.repository.findForumPostById(id);
    if (!post) throw new NotFoundException('Forum post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');
    const updated = await this.repository.updateForumPost(id, dto);
    return this.formatPost(updated, updated.author.fullName);
  }

  async deleteForumPost(id: string, userId: string) {
    const post = await this.repository.findForumPostById(id);
    if (!post) throw new NotFoundException('Forum post not found');
    if (post.authorId !== userId)
      throw new ForbiddenException('You can only delete your own posts');
    await this.repository.deleteForumPost(id);
  }

  // ── Forum Comments ──

  async createForumComment(
    postId: string,
    userId: string,
    dto: { body: string; parentId?: string },
  ) {
    const post = await this.repository.findForumPostById(postId);
    if (!post) throw new NotFoundException('Forum post not found');
    if (post.isLocked) throw new ForbiddenException('This post is locked');
    if (dto.parentId) {
      const parent = await this.repository.findForumCommentById(dto.parentId);
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }
    const comment = await this.repository.createForumComment({
      postId,
      authorId: userId,
      body: dto.body,
      parentId: dto.parentId,
    });
    return this.formatComment(comment, comment.author.fullName);
  }

  async listForumComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const comments = await this.repository.listForumComments(postId, { skip, take: limit });
    return comments.map((c) => this.formatComment(c, c.author.fullName, true));
  }

  async updateForumComment(id: string, userId: string, dto: { body: string }) {
    const comment = await this.repository.findForumCommentById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new ForbiddenException('You can only edit your own comments');
    const updated = await this.repository.updateForumComment(id, dto);
    return this.formatComment(updated, updated.author.fullName);
  }

  async deleteForumComment(id: string, userId: string) {
    const comment = await this.repository.findForumCommentById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new ForbiddenException('You can only delete your own comments');
    await this.repository.deleteForumComment(id);
  }

  // ── Likes ──

  async likePost(postId: string, userId: string) {
    const post = await this.repository.findForumPostById(postId);
    if (!post) throw new NotFoundException('Forum post not found');
    const existing = await this.repository.hasUserLikedPost(postId, userId);
    if (existing) throw new ConflictException('Already liked');
    return this.repository.likePost(postId, userId);
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.repository.findForumPostById(postId);
    if (!post) throw new NotFoundException('Forum post not found');
    const result = await this.repository.unlikePost(postId, userId);
    if (!result) throw new ConflictException('Not liked');
    return result;
  }

  // ── Study Groups ──

  async createStudyGroup(
    userId: string,
    dto: { name: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    const group = await this.repository.createStudyGroup({
      creatorId: userId,
      ...dto,
    });
    return this.formatStudyGroup(group, group.creator.fullName, 1);
  }

  async getStudyGroup(id: string) {
    const group = await this.repository.findStudyGroupById(id);
    if (!group) throw new NotFoundException('Study group not found');
    return this.formatStudyGroup(group, group.creator.fullName, group.members.length);
  }

  async listStudyGroups(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const { groups, total } = await this.repository.listStudyGroups({ skip, take: limit });
    return {
      data: groups.map((g) => this.formatStudyGroup(g, g.creator.fullName)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStudyGroup(
    id: string,
    userId: string,
    dto: { name?: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    const group = await this.repository.findStudyGroupById(id);
    if (!group) throw new NotFoundException('Study group not found');
    if (group.creatorId !== userId)
      throw new ForbiddenException('Only the creator can update this group');
    const updated = await this.repository.updateStudyGroup(id, dto);
    return this.formatStudyGroup(updated, updated.creator.fullName);
  }

  async deleteStudyGroup(id: string, userId: string) {
    const group = await this.repository.findStudyGroupById(id);
    if (!group) throw new NotFoundException('Study group not found');
    if (group.creatorId !== userId)
      throw new ForbiddenException('Only the creator can delete this group');
    await this.repository.deleteStudyGroup(id);
  }

  async joinStudyGroup(groupId: string, userId: string) {
    const group = await this.repository.findStudyGroupById(groupId);
    if (!group) throw new NotFoundException('Study group not found');
    if (!group.isPublic) throw new ForbiddenException('This group is private');
    if (group.maxMembers && group.members.length >= group.maxMembers) {
      throw new ForbiddenException('Group is full');
    }
    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) throw new ConflictException('Already a member');
    return this.repository.addStudyGroupMember(groupId, userId);
  }

  async leaveStudyGroup(groupId: string, userId: string) {
    const group = await this.repository.findStudyGroupById(groupId);
    if (!group) throw new NotFoundException('Study group not found');
    if (group.creatorId === userId) throw new ForbiddenException('Creator cannot leave the group');
    await this.repository.removeStudyGroupMember(groupId, userId);
  }

  // ── Coding Clubs ──

  async createCodingClub(
    userId: string,
    dto: { name: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    const club = await this.repository.createCodingClub({
      creatorId: userId,
      ...dto,
    });
    return this.formatCodingClub(club, club.creator.fullName, 1);
  }

  async getCodingClub(id: string) {
    const club = await this.repository.findCodingClubById(id);
    if (!club) throw new NotFoundException('Coding club not found');
    return this.formatCodingClub(club, club.creator.fullName, club.members.length);
  }

  async listCodingClubs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const { clubs, total } = await this.repository.listCodingClubs({ skip, take: limit });
    return {
      data: clubs.map((c) => this.formatCodingClub(c, c.creator.fullName)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateCodingClub(
    id: string,
    userId: string,
    dto: { name?: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    const club = await this.repository.findCodingClubById(id);
    if (!club) throw new NotFoundException('Coding club not found');
    if (club.creatorId !== userId)
      throw new ForbiddenException('Only the creator can update this club');
    const updated = await this.repository.updateCodingClub(id, dto);
    return this.formatCodingClub(updated, updated.creator.fullName);
  }

  async deleteCodingClub(id: string, userId: string) {
    const club = await this.repository.findCodingClubById(id);
    if (!club) throw new NotFoundException('Coding club not found');
    if (club.creatorId !== userId)
      throw new ForbiddenException('Only the creator can delete this club');
    await this.repository.deleteCodingClub(id);
  }

  async joinCodingClub(clubId: string, userId: string) {
    const club = await this.repository.findCodingClubById(clubId);
    if (!club) throw new NotFoundException('Coding club not found');
    if (!club.isPublic) throw new ForbiddenException('This club is private');
    if (club.maxMembers && club.members.length >= club.maxMembers) {
      throw new ForbiddenException('Club is full');
    }
    const isMember = club.members.some((m) => m.userId === userId);
    if (isMember) throw new ConflictException('Already a member');
    return this.repository.addCodingClubMember(clubId, userId);
  }

  async leaveCodingClub(clubId: string, userId: string) {
    const club = await this.repository.findCodingClubById(clubId);
    if (!club) throw new NotFoundException('Coding club not found');
    if (club.creatorId === userId) throw new ForbiddenException('Creator cannot leave the club');
    await this.repository.removeCodingClubMember(clubId, userId);
  }

  // ── Formatters ──

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatPost(post: any, authorName: string) {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      tags: post.tags ?? [],
      authorId: post.authorId,
      authorName,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isPinned: post.isPinned,
      isLocked: post.isLocked,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatComment(comment: any, authorName: string, includeReplies = false) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted: any = {
      id: comment.id,
      postId: comment.postId,
      body: comment.body,
      authorId: comment.authorId,
      authorName,
      likeCount: comment.likeCount,
      parentId: comment.parentId ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
    if (includeReplies && comment.replies) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatted.replies = comment.replies.map((r: any) => this.formatComment(r, r.author.fullName));
    }
    return formatted;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatStudyGroup(group: any, creatorName: string, memberCount?: number) {
    return {
      id: group.id,
      name: group.name,
      description: group.description ?? null,
      creatorId: group.creatorId,
      creatorName,
      isPublic: group.isPublic,
      maxMembers: group.maxMembers ?? null,
      memberCount: memberCount ?? group._count?.members ?? 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatCodingClub(club: any, creatorName: string, memberCount?: number) {
    return {
      id: club.id,
      name: club.name,
      description: club.description ?? null,
      creatorId: club.creatorId,
      creatorName,
      isPublic: club.isPublic,
      maxMembers: club.maxMembers ?? null,
      memberCount: memberCount ?? club._count?.members ?? 0,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    };
  }
}
