import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { FacultyPortalService } from './faculty-portal.service';
import { BroadcastNotificationDto } from './dto/faculty-portal.dto';

@ApiTags('faculty-portal')
@Controller('faculty')
export class FacultyPortalController {
  constructor(private readonly service: FacultyPortalService) {}

  @Get('dashboard')
  @ApiBearerAuth()
  @Roles('faculty')
  @Resource('faculty')
  @ApiOperation({ summary: 'Get faculty dashboard' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDashboard(user.id);
  }

  @Get('reports')
  @ApiBearerAuth()
  @Roles('faculty')
  @Resource('faculty')
  @ApiOperation({ summary: 'Get faculty reports (attendance, marks, exams per subject)' })
  getReports(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getReports(user.id);
  }

  @Post('notifications/broadcast')
  @ApiBearerAuth()
  @Roles('faculty')
  @Resource('faculty')
  @ApiOperation({ summary: 'Broadcast notification to students' })
  broadcastNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BroadcastNotificationDto,
  ) {
    return this.service.broadcastNotification(user.id, dto);
  }
}
