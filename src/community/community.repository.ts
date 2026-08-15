import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Forum Posts ──

  async createForumPost(data: { authorId: string; title: string; body: string; tags?: string[] }) {
    return this.prisma.forumPost.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        body: data.body,
        tags: data.tags ?? [],
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async findForumPostById(id: string) {
    return this.prisma.forumPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async incrementPostViews(id: string) {
    return this.prisma.forumPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async listForumPosts(params: { skip: number; take: number; tag?: string }) {
    const where = params.tag ? { tags: { has: params.tag } } : {};
    const [posts, total] = await Promise.all([
      this.prisma.forumPost.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: { author: { select: { id: true, fullName: true } } },
      }),
      this.prisma.forumPost.count({ where }),
    ]);
    return { posts, total };
  }

  async updateForumPost(
    id: string,
    data: {
      title?: string;
      body?: string;
      tags?: string[];
      isPinned?: boolean;
      isLocked?: boolean;
    },
  ) {
    return this.prisma.forumPost.update({
      where: { id },
      data,
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async deleteForumPost(id: string) {
    return this.prisma.forumPost.delete({ where: { id } });
  }

  // ── Forum Comments ──

  async createForumComment(data: {
    postId: string;
    authorId: string;
    body: string;
    parentId?: string;
  }) {
    const comment = await this.prisma.forumComment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        body: data.body,
        parentId: data.parentId,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await this.prisma.forumPost.update({
      where: { id: data.postId },
      data: { commentCount: { increment: 1 } },
    });
    return comment;
  }

  async findForumCommentById(id: string) {
    return this.prisma.forumComment.findUnique({
      where: { id },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async listForumComments(postId: string, params: { skip: number; take: number }) {
    return this.prisma.forumComment.findMany({
      where: { postId, parentId: null },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true } },
        replies: {
          include: { author: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateForumComment(id: string, data: { body: string }) {
    return this.prisma.forumComment.update({
      where: { id },
      data,
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async deleteForumComment(id: string) {
    const comment = await this.prisma.forumComment.findUnique({ where: { id } });
    if (comment) {
      await this.prisma.forumPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    }
    return this.prisma.forumComment.delete({ where: { id } });
  }

  // ── Likes ──

  async likePost(postId: string, userId: string) {
    const existing = await this.prisma.forumLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) return existing;

    const like = await this.prisma.forumLike.create({
      data: { postId, userId },
    });
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return like;
  }

  async unlikePost(postId: string, userId: string) {
    const existing = await this.prisma.forumLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) return null;

    await this.prisma.forumLike.delete({
      where: { postId_userId: { postId, userId } },
    });
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });
    return existing;
  }

  async hasUserLikedPost(postId: string, userId: string) {
    const like = await this.prisma.forumLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return !!like;
  }

  // ── Study Groups ──

  async createStudyGroup(data: {
    creatorId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    maxMembers?: number;
  }) {
    const group = await this.prisma.studyGroup.create({
      data: {
        creatorId: data.creatorId,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic ?? true,
        maxMembers: data.maxMembers,
      },
      include: { creator: { select: { id: true, fullName: true } } },
    });
    await this.prisma.studyGroupMember.create({
      data: { groupId: group.id, userId: data.creatorId, role: 'admin' },
    });
    return group;
  }

  async findStudyGroupById(id: string) {
    return this.prisma.studyGroup.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true } },
        members: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  async listStudyGroups(params: { skip: number; take: number }) {
    const [groups, total] = await Promise.all([
      this.prisma.studyGroup.findMany({
        where: { isPublic: true },
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, fullName: true } } },
      }),
      this.prisma.studyGroup.count({ where: { isPublic: true } }),
    ]);
    return { groups, total };
  }

  async updateStudyGroup(
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    return this.prisma.studyGroup.update({
      where: { id },
      data,
      include: { creator: { select: { id: true, fullName: true } } },
    });
  }

  async deleteStudyGroup(id: string) {
    return this.prisma.studyGroup.delete({ where: { id } });
  }

  async addStudyGroupMember(groupId: string, userId: string, role = 'member') {
    return this.prisma.studyGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, role },
      update: { role },
    });
  }

  async removeStudyGroupMember(groupId: string, userId: string) {
    return this.prisma.studyGroupMember.deleteMany({
      where: { groupId, userId },
    });
  }

  async getStudyGroupMemberCount(groupId: string) {
    return this.prisma.studyGroupMember.count({ where: { groupId } });
  }

  // ── Coding Clubs ──

  async createCodingClub(data: {
    creatorId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    maxMembers?: number;
  }) {
    const club = await this.prisma.codingClub.create({
      data: {
        creatorId: data.creatorId,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic ?? true,
        maxMembers: data.maxMembers,
      },
      include: { creator: { select: { id: true, fullName: true } } },
    });
    await this.prisma.codingClubMember.create({
      data: { clubId: club.id, userId: data.creatorId, role: 'admin' },
    });
    return club;
  }

  async findCodingClubById(id: string) {
    return this.prisma.codingClub.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true } },
        members: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  async listCodingClubs(params: { skip: number; take: number }) {
    const [clubs, total] = await Promise.all([
      this.prisma.codingClub.findMany({
        where: { isPublic: true },
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, fullName: true } } },
      }),
      this.prisma.codingClub.count({ where: { isPublic: true } }),
    ]);
    return { clubs, total };
  }

  async updateCodingClub(
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; maxMembers?: number },
  ) {
    return this.prisma.codingClub.update({
      where: { id },
      data,
      include: { creator: { select: { id: true, fullName: true } } },
    });
  }

  async deleteCodingClub(id: string) {
    return this.prisma.codingClub.delete({ where: { id } });
  }

  async addCodingClubMember(clubId: string, userId: string, role = 'member') {
    return this.prisma.codingClubMember.upsert({
      where: { clubId_userId: { clubId, userId } },
      create: { clubId, userId, role },
      update: { role },
    });
  }

  async removeCodingClubMember(clubId: string, userId: string) {
    return this.prisma.codingClubMember.deleteMany({
      where: { clubId, userId },
    });
  }

  async getCodingClubMemberCount(clubId: string) {
    return this.prisma.codingClubMember.count({ where: { clubId } });
  }
}
