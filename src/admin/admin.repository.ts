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
}
