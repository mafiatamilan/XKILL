import { CommunityService } from './community.service';
import { CommunityRepository } from './community.repository';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('CommunityService', () => {
  let service: CommunityService;
  let repo: jest.Mocked<CommunityRepository>;

  const userId = 'user-1';
  const postId = 'post-1';
  const commentId = 'comment-1';
  const groupId = 'group-1';
  const clubId = 'club-1';

  beforeEach(() => {
    repo = {
      createForumPost: jest.fn(),
      findForumPostById: jest.fn(),
      incrementPostViews: jest.fn(),
      listForumPosts: jest.fn(),
      updateForumPost: jest.fn(),
      deleteForumPost: jest.fn(),
      createForumComment: jest.fn(),
      findForumCommentById: jest.fn(),
      listForumComments: jest.fn(),
      updateForumComment: jest.fn(),
      deleteForumComment: jest.fn(),
      likePost: jest.fn(),
      unlikePost: jest.fn(),
      hasUserLikedPost: jest.fn(),
      createStudyGroup: jest.fn(),
      findStudyGroupById: jest.fn(),
      listStudyGroups: jest.fn(),
      updateStudyGroup: jest.fn(),
      deleteStudyGroup: jest.fn(),
      addStudyGroupMember: jest.fn(),
      removeStudyGroupMember: jest.fn(),
      getStudyGroupMemberCount: jest.fn(),
      createCodingClub: jest.fn(),
      findCodingClubById: jest.fn(),
      listCodingClubs: jest.fn(),
      updateCodingClub: jest.fn(),
      deleteCodingClub: jest.fn(),
      addCodingClubMember: jest.fn(),
      removeCodingClubMember: jest.fn(),
      getCodingClubMemberCount: jest.fn(),
    } as any;
    service = new CommunityService(repo);
  });

  function mockPost(overrides: Record<string, any> = {}) {
    return {
      id: postId,
      title: 'T',
      body: 'B',
      tags: [],
      authorId: userId,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: userId, fullName: 'Test' },
      ...overrides,
    };
  }

  function mockComment(overrides: Record<string, any> = {}) {
    return {
      id: commentId,
      postId,
      body: 'C',
      authorId: userId,
      likeCount: 0,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: userId, fullName: 'Test' },
      ...overrides,
    };
  }

  function mockGroup(overrides: Record<string, any> = {}) {
    return {
      id: groupId,
      name: 'G',
      description: null,
      creatorId: userId,
      isPublic: true,
      maxMembers: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, fullName: 'Test' },
      members: [],
      ...overrides,
    };
  }

  function mockClub(overrides: Record<string, any> = {}) {
    return {
      id: clubId,
      name: 'C',
      description: null,
      creatorId: userId,
      isPublic: true,
      maxMembers: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, fullName: 'Test' },
      members: [],
      ...overrides,
    };
  }

  describe('Forum Posts', () => {
    it('creates a post', async () => {
      repo.createForumPost.mockResolvedValue(mockPost() as any);
      const result = await service.createForumPost(userId, { title: 'T', body: 'B' });
      expect(result.title).toBe('T');
      expect(result.authorName).toBe('Test');
    });

    it('throws on post not found', async () => {
      repo.findForumPostById.mockResolvedValue(null);
      await expect(service.getForumPost('bad')).rejects.toThrow(NotFoundException);
    });

    it('increments views on get', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      await service.getForumPost(postId);
      expect(repo.incrementPostViews).toHaveBeenCalledWith(postId);
    });

    it('throws when editing another user post', async () => {
      repo.findForumPostById.mockResolvedValue(
        mockPost({ authorId: 'other', author: { id: 'other', fullName: 'X' } }) as any,
      );
      await expect(service.updateForumPost(postId, userId, { title: 'new' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes own post', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      await service.deleteForumPost(postId, userId);
      expect(repo.deleteForumPost).toHaveBeenCalledWith(postId);
    });
  });

  describe('Forum Comments', () => {
    it('creates a comment', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      repo.createForumComment.mockResolvedValue(mockComment() as any);
      const result = await service.createForumComment(postId, userId, { body: 'C' });
      expect(result.body).toBe('C');
    });

    it('throws on locked post', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost({ isLocked: true }) as any);
      await expect(service.createForumComment(postId, userId, { body: 'C' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when editing another user comment', async () => {
      repo.findForumCommentById.mockResolvedValue(
        mockComment({ authorId: 'other', author: { id: 'other', fullName: 'X' } }) as any,
      );
      await expect(service.updateForumComment(commentId, userId, { body: 'new' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Likes', () => {
    it('likes a post', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      repo.hasUserLikedPost.mockResolvedValue(false);
      repo.likePost.mockResolvedValue({
        id: 'like-1',
        postId,
        userId,
        createdAt: new Date(),
      } as any);
      const result = await service.likePost(postId, userId);
      expect(result.postId).toBe(postId);
    });

    it('throws on duplicate like', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      repo.hasUserLikedPost.mockResolvedValue(true);
      await expect(service.likePost(postId, userId)).rejects.toThrow(ConflictException);
    });

    it('unlikes a post', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      repo.unlikePost.mockResolvedValue({ id: 'like-1' } as any);
      await service.unlikePost(postId, userId);
      expect(repo.unlikePost).toHaveBeenCalledWith(postId, userId);
    });

    it('throws when not liked', async () => {
      repo.findForumPostById.mockResolvedValue(mockPost() as any);
      repo.unlikePost.mockResolvedValue(null);
      await expect(service.unlikePost(postId, userId)).rejects.toThrow(ConflictException);
    });
  });

  describe('Study Groups', () => {
    it('creates a group', async () => {
      repo.createStudyGroup.mockResolvedValue(mockGroup() as any);
      const result = await service.createStudyGroup(userId, { name: 'G' });
      expect(result.name).toBe('G');
      expect(result.memberCount).toBe(1);
    });

    it('throws when creator leaves', async () => {
      repo.findStudyGroupById.mockResolvedValue(mockGroup() as any);
      await expect(service.leaveStudyGroup(groupId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('prevents joining full group', async () => {
      repo.findStudyGroupById.mockResolvedValue(
        mockGroup({ maxMembers: 2, members: [{}, {}] }) as any,
      );
      await expect(service.joinStudyGroup(groupId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('prevents joining private group', async () => {
      repo.findStudyGroupById.mockResolvedValue(mockGroup({ isPublic: false }) as any);
      await expect(service.joinStudyGroup(groupId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Coding Clubs', () => {
    it('creates a club', async () => {
      repo.createCodingClub.mockResolvedValue(mockClub() as any);
      const result = await service.createCodingClub(userId, { name: 'C' });
      expect(result.name).toBe('C');
      expect(result.memberCount).toBe(1);
    });

    it('throws when creator leaves', async () => {
      repo.findCodingClubById.mockResolvedValue(mockClub() as any);
      await expect(service.leaveCodingClub(clubId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('prevents joining full club', async () => {
      repo.findCodingClubById.mockResolvedValue(
        mockClub({ maxMembers: 5, members: [{}, {}, {}, {}, {}] }) as any,
      );
      await expect(service.joinCodingClub(clubId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
