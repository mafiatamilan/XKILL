import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { AdminService } from './admin.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateUserStatusDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  AuditLogQueryDto,
  ApiUsageQueryDto,
} from './dto/role.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Resource('all')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Patch('users/:id/suspend')
  @Resource('users')
  @ApiOperation({ summary: 'Suspend a user account (they can no longer log in or use tokens)' })
  suspendUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Ip() ip: string,
  ) {
    return this.admin.suspendUser(admin.id, id, dto, ip);
  }

  @Patch('users/:id/reactivate')
  @Resource('users')
  @ApiOperation({ summary: 'Reactivate a suspended user account' })
  reactivateUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.admin.reactivateUser(admin.id, id, ip);
  }

  @Get('roles')
  @Resource('roles')
  @ApiOperation({ summary: 'List roles with their permissions' })
  listRoles(@Query() query: PaginationQueryDto) {
    return this.admin.listRoles(query.page, query.limit, query.search);
  }

  @Post('roles')
  @Resource('roles')
  @ApiOperation({ summary: 'Create a role with a permission set' })
  createRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
    @Ip() ip: string,
  ) {
    return this.admin.createRole(admin.id, dto, ip);
  }

  @Patch('roles/:id')
  @Resource('roles')
  @ApiOperation({ summary: 'Update a role name/description/permissions' })
  updateRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Ip() ip: string,
  ) {
    return this.admin.updateRole(admin.id, id, dto, ip);
  }

  // ── Feature Flags ──

  @Get('feature-flags')
  @Resource('feature-flags')
  @ApiOperation({ summary: 'List all feature flags' })
  listFeatureFlags() {
    return this.admin.listFeatureFlags();
  }

  @Post('feature-flags')
  @Resource('feature-flags')
  @ApiOperation({ summary: 'Create a feature flag' })
  createFeatureFlag(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateFeatureFlagDto,
    @Ip() ip: string,
  ) {
    return this.admin.createFeatureFlag(admin.id, dto, ip);
  }

  @Patch('feature-flags/:key')
  @Resource('feature-flags')
  @ApiOperation({ summary: 'Update a feature flag' })
  updateFeatureFlag(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Ip() ip: string,
  ) {
    return this.admin.updateFeatureFlag(admin.id, key, dto, ip);
  }

  @Get('maintenance-mode')
  @Resource('system-settings')
  @ApiOperation({ summary: 'Get maintenance mode status' })
  getMaintenanceMode() {
    return this.admin.getMaintenanceMode();
  }

  @Post('maintenance-mode/toggle')
  @Resource('system-settings')
  @ApiOperation({ summary: 'Toggle maintenance mode on/off' })
  toggleMaintenanceMode(@CurrentUser() admin: AuthenticatedUser, @Ip() ip: string) {
    return this.admin.toggleMaintenanceMode(admin.id, ip);
  }

  // ── Backups ──

  @Get('backups')
  @Resource('backups')
  @ApiOperation({ summary: 'List recent backups' })
  listBackups() {
    return this.admin.listBackups();
  }

  @Post('backups/trigger')
  @Resource('backups')
  @ApiOperation({ summary: 'Trigger a new backup' })
  triggerBackup(@CurrentUser() admin: AuthenticatedUser, @Ip() ip: string) {
    return this.admin.triggerBackup(admin.id, ip);
  }

  // ── Audit Logs ──

  @Get('audit-logs')
  @Resource('audit-logs')
  @ApiOperation({ summary: 'List audit logs with filters' })
  listAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.admin.listAuditLogs(query.page!, query.limit!, {
      action: query.action,
      userId: query.userId,
      entityType: query.entityType,
    });
  }

  // ── API Usage ──

  @Get('api-usage')
  @Resource('api-usage')
  @ApiOperation({ summary: 'Get API usage statistics' })
  getApiUsageStats(@Query() query: ApiUsageQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.admin.getApiUsageStats(startDate, endDate);
  }

  // ── Error Monitoring ──

  @Get('error-monitoring')
  @Resource('error-monitoring')
  @ApiOperation({ summary: 'Get error statistics' })
  getErrorStats(@Query() query: ApiUsageQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.admin.getErrorStats(startDate, endDate);
  }

  // ── Health ──

  @Get('health')
  @Resource('health')
  @ApiOperation({ summary: 'System health check' })
  healthCheck() {
    return this.admin.healthCheck();
  }
}
