import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { DsaTrackService } from './dsa-track.service';
import {
  AddPlaylistProblemDto,
  CreateDiscussionDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  UpdateVisibilityDto,
} from './dto/dsa-track.dto';

@ApiTags('dsa')
@ApiBearerAuth()
@Roles('student')
@Controller('dsa')
export class DsaTrackController {
  constructor(private readonly track: DsaTrackService) {}

  @Post('playlists')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'Create a private playlist (share it by setting isPublic)' })
  createPlaylist(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePlaylistDto) {
    return this.track.createPlaylist(user.id, dto);
  }

  @Get('playlists')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'List my playlists' })
  listMyPlaylists(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.track.listMyPlaylists(user.id, query.page, query.limit);
  }

  @Get('playlists/:id')
  @Resource('dsa-playlists')
  @ApiOperation({
    summary: 'Get a playlist — private playlists of other users return 404 (no existence leak)',
  })
  getPlaylist(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.track.getPlaylist(user.id, id);
  }

  @Patch('playlists/:id')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'Update my playlist' })
  updatePlaylist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.track.updatePlaylist(user.id, id, dto);
  }

  @Delete('playlists/:id')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'Delete my playlist' })
  deletePlaylist(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.track.deletePlaylist(user.id, id);
  }

  @Post('playlists/:id/problems')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'Add a problem to my playlist' })
  addPlaylistProblem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddPlaylistProblemDto,
  ) {
    return this.track.addProblemToPlaylist(user.id, id, dto.problemId);
  }

  @Delete('playlists/:id/problems/:problemId')
  @Resource('dsa-playlists')
  @ApiOperation({ summary: 'Remove a problem from my playlist' })
  removePlaylistProblem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('problemId') problemId: string,
  ) {
    return this.track.removeProblemFromPlaylist(user.id, id, problemId);
  }

  @Get('sheets')
  @Resource('dsa-sheets')
  @ApiOperation({ summary: 'List curated sheets with my live progress per sheet' })
  listSheets(@CurrentUser() user: AuthenticatedUser) {
    return this.track.listSheets(user.id);
  }

  @Get('sheets/:id')
  @Resource('dsa-sheets')
  @ApiOperation({ summary: 'Get a sheet with per-problem completion for me' })
  getSheet(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.track.getSheet(user.id, id);
  }

  @Get('progress/me')
  @Resource('dsa-progress')
  @ApiOperation({ summary: 'Live solved-progress by difficulty/topic/company and time buckets' })
  getMyProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.track.getMyProgress(user.id);
  }

  @Get('analytics/me')
  @Resource('dsa-analytics')
  @ApiOperation({
    summary:
      'Live analytics: accuracy, heatmap, weak/strong topics, average runtime, rating placeholder',
  })
  getMyAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.track.getMyAnalytics(user.id);
  }

  @Get('profile/visibility')
  @Resource('dsa-profile')
  @ApiOperation({ summary: 'Get my recruiter-visibility settings' })
  getVisibility(@CurrentUser() user: AuthenticatedUser) {
    return this.track.getVisibility(user.id);
  }

  @Patch('profile/visibility')
  @Resource('dsa-profile')
  @ApiOperation({ summary: 'Toggle which profile fields recruiters may see' })
  updateVisibility(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVisibilityDto) {
    return this.track.updateVisibility(user.id, dto);
  }

  @Get('problems/:id/discussion')
  @Resource('dsa-discussion')
  @ApiOperation({ summary: 'List discussion posts for a problem' })
  listDiscussions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.track.listDiscussions(user.id, id, query.page, query.limit);
  }

  @Post('problems/:id/discussion')
  @Resource('dsa-discussion')
  @ApiOperation({ summary: 'Create a discussion post for a problem' })
  createDiscussion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateDiscussionDto,
  ) {
    return this.track.createDiscussion(user.id, id, dto);
  }

  @Post('discussion/:id/upvote')
  @Resource('dsa-discussion')
  @ApiOperation({ summary: 'Upvote a discussion post (idempotent — one vote per user)' })
  upvoteDiscussion(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.track.upvoteDiscussion(user.id, id);
  }
}
