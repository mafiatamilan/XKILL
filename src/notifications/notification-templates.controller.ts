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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Admin Notification Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'admin/notification-templates', version: 'v1' })
export class NotificationTemplatesController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @Roles('admin', 'college_admin')
  @Resource('notification-templates')
  @ApiOperation({ summary: 'Create a notification template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get()
  @Roles('admin', 'college_admin')
  @Resource('notification-templates')
  @ApiOperation({ summary: 'List notification templates' })
  @ApiResponse({ status: 200, description: 'Paginated templates' })
  async list(@Query() query: TemplateQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.service.listTemplates(page, limit, {
      channel: query.channel,
      isActive: query.isActive,
    });
  }

  @Get(':id')
  @Roles('admin', 'college_admin')
  @Resource('notification-templates')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiResponse({ status: 200, description: 'Template found' })
  async getOne(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @Patch(':id')
  @Roles('admin', 'college_admin')
  @Resource('notification-templates')
  @ApiOperation({ summary: 'Update a template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @Resource('notification-templates')
  @ApiOperation({ summary: 'Delete a template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async remove(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }
}
