import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { StudentsService } from './students.service';
import {
  CreateCareerGoalDto,
  CreateSkillDto,
  UpdateCareerGoalDto,
  UpdateSkillDto,
  UpsertProfileDto,
} from './dto/profile.dto';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  UpdateSettingsDto,
} from './dto/calendar.dto';
import { NotificationQueryDto } from './dto/notification.dto';

@ApiTags('students')
@ApiBearerAuth()
@Roles('student')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('me/dashboard')
  @Resource('dashboard')
  @ApiOperation({
    summary: 'Aggregated dashboard: readiness, notifications, upcoming events, activity',
  })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.students.getDashboard(user.id);
  }

  @Get('me/profile')
  @Resource('student-profile')
  @ApiOperation({ summary: 'Get the current student profile (empty defaults until first update)' })
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.students.getProfile(user.id);
  }

  @Patch('me/profile')
  @Resource('student-profile')
  @ApiOperation({ summary: 'Create or update the current student profile' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertProfileDto,
    @Ip() ip: string,
  ) {
    return this.students.updateProfile(user.id, dto as unknown as Record<string, unknown>, ip);
  }

  // ---- Skills ----

  @Get('me/skills')
  @Resource('skills')
  @ApiOperation({ summary: 'List the current student skills' })
  listSkills(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.students.listSkills(user.id, query.page, query.limit);
  }

  @Post('me/skills')
  @Resource('skills')
  @ApiOperation({ summary: 'Add a skill to the current student profile' })
  createSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSkillDto,
    @Ip() ip: string,
  ) {
    return this.students.createSkill(user.id, dto as unknown as Record<string, unknown>, ip);
  }

  @Patch('me/skills/:id')
  @Resource('skills')
  @ApiOperation({ summary: 'Update a skill' })
  updateSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
    @Ip() ip: string,
  ) {
    return this.students.updateSkill(user.id, id, dto as unknown as Record<string, unknown>, ip);
  }

  @Delete('me/skills/:id')
  @HttpCode(204)
  @Resource('skills')
  @ApiOperation({ summary: 'Remove a skill' })
  async deleteSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.students.deleteSkill(user.id, id, ip);
  }

  // ---- Career goals ----

  @Get('me/career-goals')
  @Resource('career-goals')
  @ApiOperation({ summary: 'List the current student career goals' })
  listCareerGoals(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.students.listCareerGoals(user.id, query.page, query.limit);
  }

  @Post('me/career-goals')
  @Resource('career-goals')
  @ApiOperation({ summary: 'Create a career goal' })
  createCareerGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCareerGoalDto,
    @Ip() ip: string,
  ) {
    return this.students.createCareerGoal(user.id, dto as unknown as Record<string, unknown>, ip);
  }

  @Patch('me/career-goals/:id')
  @Resource('career-goals')
  @ApiOperation({ summary: 'Update a career goal' })
  updateCareerGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCareerGoalDto,
    @Ip() ip: string,
  ) {
    return this.students.updateCareerGoal(
      user.id,
      id,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Delete('me/career-goals/:id')
  @HttpCode(204)
  @Resource('career-goals')
  @ApiOperation({ summary: 'Delete a career goal' })
  async deleteCareerGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.students.deleteCareerGoal(user.id, id, ip);
  }

  // ---- Calendar ----

  @Get('me/calendar')
  @Resource('calendar')
  @ApiOperation({ summary: 'List the current student calendar events' })
  listCalendarEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.students.listCalendarEvents(user.id, query.page, query.limit);
  }

  @Post('me/calendar')
  @Resource('calendar')
  @ApiOperation({ summary: 'Create a calendar event' })
  createCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCalendarEventDto,
    @Ip() ip: string,
  ) {
    return this.students.createCalendarEvent(
      user.id,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Patch('me/calendar/:id')
  @Resource('calendar')
  @ApiOperation({ summary: 'Update a calendar event' })
  updateCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
    @Ip() ip: string,
  ) {
    return this.students.updateCalendarEvent(
      user.id,
      id,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Delete('me/calendar/:id')
  @HttpCode(204)
  @Resource('calendar')
  @ApiOperation({ summary: 'Delete a calendar event' })
  async deleteCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.students.deleteCalendarEvent(user.id, id, ip);
  }

  // ---- Settings ----

  @Get('me/settings')
  @Resource('settings')
  @ApiOperation({ summary: 'Get the current student settings (defaults on first access)' })
  settings(@CurrentUser() user: AuthenticatedUser) {
    return this.students.getSettings(user.id);
  }

  @Patch('me/settings')
  @Resource('settings')
  @ApiOperation({ summary: 'Update the current student settings' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
    @Ip() ip: string,
  ) {
    return this.students.updateSettings(user.id, dto as unknown as Record<string, unknown>, ip);
  }

  // ---- Readiness ----

  @Get('me/readiness-score')
  @Resource('readiness')
  @ApiOperation({ summary: 'Get the current readiness score (null until first recalculate)' })
  readinessScore(@CurrentUser() user: AuthenticatedUser) {
    return this.students.getReadinessScore(user.id);
  }

  @Post('me/readiness-score/recalculate')
  @Resource('readiness')
  @ApiOperation({ summary: 'Recalculate the readiness score from the current profile state' })
  recalculateReadiness(@CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.students.recalculateReadinessScore(user.id, ip);
  }

  // ---- Notifications ----

  @Get('me/notifications')
  @Resource('notifications')
  @ApiOperation({ summary: 'List the current student notifications (unreadOnly=true for unread)' })
  listNotifications(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    return this.students.listNotifications(
      user.id,
      query.page,
      query.limit,
      query.unreadOnly ?? false,
    );
  }

  @Patch('me/notifications/:id/read')
  @Resource('notifications')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.students.markNotificationRead(user.id, id, ip);
  }

  @Patch('me/notifications/read-all')
  @Resource('notifications')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.students.markAllNotificationsRead(user.id, ip);
  }

  // ---- Activity ----

  @Get('me/activity-timeline')
  @Resource('activity')
  @ApiOperation({ summary: 'Recent activity timeline for the current student' })
  activityTimeline(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.students.getActivityTimeline(user.id, query.page, query.limit);
  }
}
