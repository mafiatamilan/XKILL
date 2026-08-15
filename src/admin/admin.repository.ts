import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { role: true } });
  }

  async updateUserStatus(
    id: string,
    data: { isActive: boolean; suspendedAt?: Date | null; suspendReason?: string | null },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  listRoles(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.RoleWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.role.findMany({
      where,
      include: { permissions: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  countRoles(search?: string): Promise<number> {
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.role.count({ where });
  }

  findRoleById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { select: { name: true } } },
    });
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } });
  }

  findPermissionsByNames(names: string[]) {
    return this.prisma.permission.findMany({ where: { name: { in: names } } });
  }

  createRole(data: {
    name: string;
    description?: string;
    isSystem?: boolean;
    permissionIds: string[];
  }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem ?? false,
        permissions: { connect: data.permissionIds.map((id) => ({ id })) },
      },
      include: { permissions: { select: { name: true } } },
    });
  }

  updateRole(id: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.permissionIds !== undefined
          ? {
              permissions: {
                set: data.permissionIds.map((permissionId) => ({ id: permissionId })),
              },
            }
          : {}),
      },
      include: { permissions: { select: { name: true } } },
    });
  }

  // ── Feature Flags ──

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findFeatureFlagByKey(key: string) {
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  async createFeatureFlag(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
    rolloutPct?: number;
  }) {
    return this.prisma.featureFlag.create({ data });
  }

  async updateFeatureFlag(
    key: string,
    data: { name?: string; description?: string; isEnabled?: boolean; rolloutPct?: number },
  ) {
    return this.prisma.featureFlag.update({ where: { key }, data });
  }

  async deleteFeatureFlag(key: string) {
    return this.prisma.featureFlag.delete({ where: { key } });
  }

  // ── System Settings ──

  async getSystemSetting(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async listSystemSettings(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.systemSetting.findMany({ where, orderBy: { key: 'asc' } });
  }

  async upsertSystemSetting(data: {
    key: string;
    value: string;
    category?: string;
    description?: string;
    updatedBy?: string;
  }) {
    return this.prisma.systemSetting.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        value: data.value,
        category: data.category,
        description: data.description,
        updatedBy: data.updatedBy,
      },
      update: {
        value: data.value,
        category: data.category,
        description: data.description,
        updatedBy: data.updatedBy,
      },
    });
  }

  // ── Backups ──

  async createBackup(data: { filename: string; triggeredBy?: string }) {
    return this.prisma.backupRecord.create({
      data: { filename: data.filename, triggeredBy: data.triggeredBy, status: 'pending' },
    });
  }

  async updateBackup(
    id: string,
    data: { status?: string; sizeBytes?: number; durationMs?: number; completedAt?: Date },
  ) {
    return this.prisma.backupRecord.update({ where: { id }, data });
  }

  async listBackups(take = 20) {
    return this.prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' }, take });
  }

  // ── Audit Logs ──

  async listAuditLogs(params: {
    skip: number;
    take: number;
    action?: string;
    userId?: string;
    entityType?: string;
  }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.userId) where.userId = params.userId;
    if (params.entityType) where.entityType = { contains: params.entityType, mode: 'insensitive' };
    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
    ]);
    return { logs, total };
  }

  // ── API Usage ──

  async recordApiUsage(data: {
    endpoint: string;
    method: string;
    statusCode: number;
    userId?: string;
    durationMs?: number;
    ip?: string;
  }) {
    return this.prisma.apiUsageRecord.create({ data });
  }

  async getApiUsageStats(params: { startDate?: Date; endDate?: Date }) {
    const where: Prisma.ApiUsageRecordWhereInput = {};
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }
    const [totalRequests, byEndpoint, byStatus] = await Promise.all([
      this.prisma.apiUsageRecord.count({ where }),
      this.prisma.apiUsageRecord.groupBy({
        by: ['endpoint', 'method'],
        where,
        _count: { id: true },
        _avg: { durationMs: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.apiUsageRecord.groupBy({
        by: ['statusCode'],
        where,
        _count: { id: true },
      }),
    ]);
    return { totalRequests, byEndpoint, byStatus };
  }

  // ── Error Monitoring ──

  async getErrorStats(params: { startDate?: Date; endDate?: Date }) {
    const where: Prisma.ApiUsageRecordWhereInput = {
      statusCode: { gte: 400 },
    };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }
    const [totalErrors, byEndpoint, byStatus] = await Promise.all([
      this.prisma.apiUsageRecord.count({ where }),
      this.prisma.apiUsageRecord.groupBy({
        by: ['endpoint', 'method', 'statusCode'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.apiUsageRecord.groupBy({
        by: ['statusCode'],
        where,
        _count: { id: true },
      }),
    ]);
    return { totalErrors, byEndpoint, byStatus };
  }

  // ── Health ──

  async healthCheck() {
    const result = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    const dbOk = result.length > 0 && result[0].ok === 1;
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }
}
