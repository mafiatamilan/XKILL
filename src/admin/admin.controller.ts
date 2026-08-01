import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { AdminService } from './admin.service';
import { CreateRoleDto, UpdateRoleDto, UpdateUserStatusDto } from './dto/role.dto';

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
}
