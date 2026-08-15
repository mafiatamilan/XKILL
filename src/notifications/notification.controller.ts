import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'notifications', version: 'v1' })
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get('me')
  @Roles('student', 'faculty', 'college_admin', 'recruiter', 'tpo', 'admin')
  @Resource('notifications')
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async listMyNotifications(
    @Request() req: { user: { id: string } },
    @Query() query: NotificationQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.service.listMyNotifications(req.user.id, page, limit, query.unreadOnly);
  }

  @Patch(':id/read')
  @Roles('student', 'faculty', 'college_admin', 'recruiter', 'tpo', 'admin')
  @Resource('notifications')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.service.markNotificationRead(req.user.id, id);
  }

  @Patch('read-all')
  @Roles('student', 'faculty', 'college_admin', 'recruiter', 'tpo', 'admin')
  @Resource('notifications')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Request() req: { user: { id: string } }) {
    return this.service.markAllNotificationsRead(req.user.id);
  }
}
