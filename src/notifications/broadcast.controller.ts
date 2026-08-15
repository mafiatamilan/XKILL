import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { BroadcastDto, BroadcastQueryDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Admin Broadcast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'admin/broadcast', version: 'v1' })
export class BroadcastController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @Roles('admin', 'college_admin', 'faculty')
  @Resource('broadcast')
  @ApiOperation({ summary: 'Broadcast a notification (fan-out via BullMQ)' })
  @ApiResponse({ status: 201, description: 'Broadcast queued' })
  async broadcast(@Request() req: { user: { id: string } }, @Body() dto: BroadcastDto) {
    return this.service.broadcast(dto, req.user.id);
  }

  @Get()
  @Roles('admin', 'college_admin')
  @Resource('broadcast')
  @ApiOperation({ summary: 'List broadcast messages' })
  @ApiResponse({ status: 200, description: 'Paginated broadcasts' })
  async list(@Query() query: BroadcastQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.service.listBroadcasts(page, limit, {
      status: query.status,
    });
  }

  @Get(':id')
  @Roles('admin', 'college_admin')
  @Resource('broadcast')
  @ApiOperation({ summary: 'Get a broadcast message by ID' })
  @ApiResponse({ status: 200, description: 'Broadcast message found' })
  async getOne(@Param('id') id: string) {
    return this.service.getBroadcast(id);
  }
}
