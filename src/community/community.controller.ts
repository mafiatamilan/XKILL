import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';
import {
  CreateForumPostDto,
  UpdateForumPostDto,
  CreateForumCommentDto,
  UpdateForumCommentDto,
  CreateStudyGroupDto,
  UpdateStudyGroupDto,
  CreateCodingClubDto,
  UpdateCodingClubDto,
  PaginationQueryDto,
} from './dto/community.dto';

@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  // ── Forum Posts ──

  @Get('forum/posts')
  @Roles('student')
  @Resource('forum-posts')
  @ApiOperation({ summary: 'List forum posts' })
  @ApiResponse({ status: 200 })
  async listPosts(@Query() query: PaginationQueryDto) {
    return this.service.listForumPosts(query.page, query.limit);
  }

  @Get('forum/posts/:id')
  @Roles('student')
  @Resource('forum-posts')
  @ApiOperation({ summary: 'Get a forum post by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(@Param('id') id: string) {
    return this.service.getForumPost(id);
  }

  @Post('forum/posts')
  @Roles('student')
  @Resource('forum-posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a forum post' })
  @ApiResponse({ status: 201 })
  async createPost(@CurrentUser('id') userId: string, @Body() dto: CreateForumPostDto) {
    return this.service.createForumPost(userId, dto);
  }

  @Put('forum/posts/:id')
  @Roles('student')
  @Resource('forum-posts')
  @ApiOperation({ summary: 'Update a forum post' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Not the author' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updatePost(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateForumPostDto,
  ) {
    return this.service.updateForumPost(id, userId, dto);
  }

  @Delete('forum/posts/:id')
  @Roles('student')
  @Resource('forum-posts')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a forum post' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not the author' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async deletePost(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.deleteForumPost(id, userId);
  }

  // ── Forum Comments ──

  @Get('forum/posts/:postId/comments')
  @Roles('student')
  @Resource('forum-comments')
  @ApiOperation({ summary: 'List comments on a forum post' })
  @ApiResponse({ status: 200 })
  async listComments(@Param('postId') postId: string, @Query() query: PaginationQueryDto) {
    return this.service.listForumComments(postId, query.page, query.limit);
  }

  @Post('forum/posts/:postId/comments')
  @Roles('student')
  @Resource('forum-comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Comment on a forum post' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Post is locked' })
  async createComment(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateForumCommentDto,
  ) {
    return this.service.createForumComment(postId, userId, dto);
  }

  @Put('forum/comments/:id')
  @Roles('student')
  @Resource('forum-comments')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Not the author' })
  async updateComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateForumCommentDto,
  ) {
    return this.service.updateForumComment(id, userId, dto);
  }

  @Delete('forum/comments/:id')
  @Roles('student')
  @Resource('forum-comments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not the author' })
  async deleteComment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.deleteForumComment(id, userId);
  }

  // ── Likes ──

  @Post('posts/:id/like')
  @Roles('student')
  @Resource('forum-likes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Like a forum post' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Already liked' })
  async likePost(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.likePost(id, userId);
  }

  @Delete('posts/:id/like')
  @Roles('student')
  @Resource('forum-likes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a forum post' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: 'Not liked' })
  async unlikePost(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.unlikePost(id, userId);
  }

  // ── Study Groups ──

  @Get('study-groups')
  @Roles('student')
  @Resource('study-groups')
  @ApiOperation({ summary: 'List study groups' })
  @ApiResponse({ status: 200 })
  async listStudyGroups(@Query() query: PaginationQueryDto) {
    return this.service.listStudyGroups(query.page, query.limit);
  }

  @Get('study-groups/:id')
  @Roles('student')
  @Resource('study-groups')
  @ApiOperation({ summary: 'Get a study group by ID' })
  @ApiResponse({ status: 200 })
  async getStudyGroup(@Param('id') id: string) {
    return this.service.getStudyGroup(id);
  }

  @Post('study-groups')
  @Roles('student')
  @Resource('study-groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a study group' })
  @ApiResponse({ status: 201 })
  async createStudyGroup(@CurrentUser('id') userId: string, @Body() dto: CreateStudyGroupDto) {
    return this.service.createStudyGroup(userId, dto);
  }

  @Put('study-groups/:id')
  @Roles('student')
  @Resource('study-groups')
  @ApiOperation({ summary: 'Update a study group' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Not the creator' })
  async updateStudyGroup(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudyGroupDto,
  ) {
    return this.service.updateStudyGroup(id, userId, dto);
  }

  @Delete('study-groups/:id')
  @Roles('student')
  @Resource('study-groups')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a study group' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not the creator' })
  async deleteStudyGroup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.deleteStudyGroup(id, userId);
  }

  @Post('study-groups/:id/join')
  @Roles('student')
  @Resource('study-groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Join a study group' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Private or full' })
  async joinStudyGroup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.joinStudyGroup(id, userId);
  }

  @Post('study-groups/:id/leave')
  @Roles('student')
  @Resource('study-groups')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a study group' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Creator cannot leave' })
  async leaveStudyGroup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.leaveStudyGroup(id, userId);
  }

  // ── Coding Clubs ──

  @Get('coding-clubs')
  @Roles('student')
  @Resource('coding-clubs')
  @ApiOperation({ summary: 'List coding clubs' })
  @ApiResponse({ status: 200 })
  async listCodingClubs(@Query() query: PaginationQueryDto) {
    return this.service.listCodingClubs(query.page, query.limit);
  }

  @Get('coding-clubs/:id')
  @Roles('student')
  @Resource('coding-clubs')
  @ApiOperation({ summary: 'Get a coding club by ID' })
  @ApiResponse({ status: 200 })
  async getCodingClub(@Param('id') id: string) {
    return this.service.getCodingClub(id);
  }

  @Post('coding-clubs')
  @Roles('student')
  @Resource('coding-clubs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coding club' })
  @ApiResponse({ status: 201 })
  async createCodingClub(@CurrentUser('id') userId: string, @Body() dto: CreateCodingClubDto) {
    return this.service.createCodingClub(userId, dto);
  }

  @Put('coding-clubs/:id')
  @Roles('student')
  @Resource('coding-clubs')
  @ApiOperation({ summary: 'Update a coding club' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Not the creator' })
  async updateCodingClub(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCodingClubDto,
  ) {
    return this.service.updateCodingClub(id, userId, dto);
  }

  @Delete('coding-clubs/:id')
  @Roles('student')
  @Resource('coding-clubs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coding club' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not the creator' })
  async deleteCodingClub(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.deleteCodingClub(id, userId);
  }

  @Post('coding-clubs/:id/join')
  @Roles('student')
  @Resource('coding-clubs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Join a coding club' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Private or full' })
  async joinCodingClub(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.joinCodingClub(id, userId);
  }

  @Post('coding-clubs/:id/leave')
  @Roles('student')
  @Resource('coding-clubs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a coding club' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Creator cannot leave' })
  async leaveCodingClub(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.leaveCodingClub(id, userId);
  }
}
