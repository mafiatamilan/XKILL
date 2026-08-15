import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementQueryDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Admin Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'admin/announcements', version: 'v1' })
export class AnnouncementsController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @Roles('admin', 'college_admin', 'faculty')
  @Resource('announcements')
  @ApiOperation({ summary: 'Create an announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async create(@Request() req: { user: { id: string } }, @Body() dto: CreateAnnouncementDto) {
    return this.service.createAnnouncement(req.user.id, dto);
  }

  @Get()
  @Roles('admin', 'college_admin', 'faculty')
  @Resource('announcements')
  @ApiOperation({ summary: 'List announcements (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated announcements' })
  async list(@Query() query: AnnouncementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.service.listAnnouncements(page, limit, {
      type: query.type,
      isPublished: query.isPublished,
    });
  }

  @Get(':id')
  @Roles('admin', 'college_admin', 'faculty')
  @Resource('announcements')
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement found' })
  async getOne(@Param('id') id: string) {
    return this.service.getAnnouncement(id);
  }

  @Patch(':id')
  @Roles('admin', 'college_admin')
  @Resource('announcements')
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.updateAnnouncement(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'college_admin')
  @Resource('announcements')
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted' })
  async remove(@Param('id') id: string) {
    return this.service.deleteAnnouncement(id);
  }

  @Post(':id/publish')
  @Roles('admin', 'college_admin')
  @Resource('announcements')
  @ApiOperation({ summary: 'Publish an announcement (makes it visible to target roles)' })
  @ApiResponse({ status: 200, description: 'Announcement published' })
  async publish(@Param('id') id: string) {
    return this.service.publishAnnouncement(id);
  }
}
