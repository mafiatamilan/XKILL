import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { AdminRepository } from './admin.repository';
import { CreateRoleDto, RoleResponseDto, UpdateRoleDto, UpdateUserStatusDto } from './dto/role.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly audit: AuditService,
  ) {}

  async suspendUser(adminId: string, userId: string, dto: UpdateUserStatusDto, ip?: string) {
    const user = await this.repository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (!user.isActive) {
      throw new ConflictException({
        code: 'USER_ALREADY_SUSPENDED',
        message: 'User is already suspended',
      });
    }
    const now = new Date();
    const updated = await this.repository.updateUserStatus(userId, {
      isActive: false,
      suspendedAt: now,
      suspendReason: dto.reason ?? null,
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.user.suspend',
      entityType: 'user',
      entityId: userId,
      before: { isActive: user.isActive, role: user.role.name },
      after: {
        isActive: updated.isActive,
        suspendedAt: now.toISOString(),
        reason: dto.reason ?? null,
      },
      ip,
    });
    return updated;
  }

  async reactivateUser(adminId: string, userId: string, ip?: string) {
    const user = await this.repository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (user.isActive) {
      throw new ConflictException({ code: 'USER_NOT_SUSPENDED', message: 'User is not suspended' });
    }
    const updated = await this.repository.updateUserStatus(userId, {
      isActive: true,
      suspendedAt: null,
      suspendReason: null,
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.user.reactivate',
      entityType: 'user',
      entityId: userId,
      before: { isActive: user.isActive, suspendedAt: user.suspendedAt?.toISOString() ?? null },
      after: { isActive: updated.isActive, suspendedAt: null },
      ip,
    });
    return updated;
  }

  async listRoles(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: RoleResponseDto[]; meta: PaginationMeta }> {
    const [total, roles] = await Promise.all([
      this.repository.countRoles(search),
      this.repository.listRoles({ skip: (page - 1) * limit, take: limit, search }),
    ]);
    return {
      data: roles.map((role) => this.toRoleResponse(role)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createRole(adminId: string, dto: CreateRoleDto, ip?: string): Promise<RoleResponseDto> {
    const name = dto.name.trim();
    const existing = await this.repository.findRoleByName(name);
    if (existing) {
      throw new ConflictException({
        code: 'ROLE_ALREADY_EXISTS',
        message: `Role '${name}' already exists`,
      });
    }
    const permissionIds = await this.resolvePermissions(dto.permissions ?? []);
    const role = await this.repository.createRole({
      name,
      description: dto.description,
      permissionIds,
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.role.create',
      entityType: 'role',
      entityId: role.id,
      after: { name: role.name, permissions: role.permissions.map((p) => p.name) },
      ip,
    });
    return this.toRoleResponse(role);
  }

  async updateRole(
    adminId: string,
    roleId: string,
    dto: UpdateRoleDto,
    ip?: string,
  ): Promise<RoleResponseDto> {
    const existing = await this.repository.findRoleById(roleId);
    if (!existing) {
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    }
    if (dto.name) {
      const name = dto.name.trim();
      const duplicate = await this.repository.findRoleByName(name);
      if (duplicate && duplicate.id !== roleId) {
        throw new ConflictException({
          code: 'ROLE_ALREADY_EXISTS',
          message: `Role '${name}' already exists`,
        });
      }
      dto.name = name;
    }
    const permissionIds =
      dto.permissions !== undefined ? await this.resolvePermissions(dto.permissions) : undefined;
    const role = await this.repository.updateRole(roleId, {
      name: dto.name,
      description: dto.description,
      permissionIds,
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.role.update',
      entityType: 'role',
      entityId: roleId,
      before: {
        name: existing.name,
        permissions: existing.permissions.map((p) => p.name),
      },
      after: {
        name: role.name,
        permissions: role.permissions.map((p) => p.name),
      },
      ip,
    });
    return this.toRoleResponse(role);
  }

  private async resolvePermissions(names: string[]): Promise<string[]> {
    if (names.length === 0) {
      return [];
    }
    const permissions = await this.repository.findPermissionsByNames(names);
    const found = new Set(permissions.map((p) => p.name));
    const missing = names.filter((name) => !found.has(name));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'UNKNOWN_PERMISSIONS',
        message: `Unknown permission(s): ${missing.join(', ')}`,
      });
    }
    return permissions.map((p) => p.id);
  }

  private toRoleResponse(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{ name: string }>;
  }): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.description = role.description ?? undefined;
    dto.isSystem = role.isSystem;
    dto.permissions = role.permissions.map((p) => p.name);
    dto.createdAt = role.createdAt.toISOString();
    dto.updatedAt = role.updatedAt.toISOString();
    return dto;
  }
}
