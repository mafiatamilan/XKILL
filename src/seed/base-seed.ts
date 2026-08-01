import { PrismaClient } from '@prisma/client';

export const SEED_ROLES: Array<{
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}> = [
  {
    name: 'admin',
    description: 'Platform super administrator',
    isSystem: true,
    permissions: ['manage:all'],
  },
  {
    name: 'student',
    description: 'College student on the platform',
    isSystem: true,
    permissions: [
      'read:self',
      'read:sessions',
      'delete:sessions',
      'manage:student-profile',
      'manage:skills',
      'manage:career-goals',
      'manage:calendar',
      'manage:settings',
      'manage:notifications',
      'manage:readiness',
      'read:activity',
      'read:dashboard',
    ],
  },
  {
    name: 'faculty',
    description: 'College faculty member',
    isSystem: true,
    permissions: ['read:self'],
  },
  {
    name: 'college_admin',
    description: 'College administrator',
    isSystem: true,
    permissions: ['read:self'],
  },
  {
    name: 'recruiter',
    description: 'Company recruiter',
    isSystem: true,
    permissions: ['read:self'],
  },
  {
    name: 'tpo',
    description: 'Training & placement officer',
    isSystem: true,
    permissions: ['read:self'],
  },
  {
    name: 'parent',
    description: 'Parent of a student',
    isSystem: true,
    permissions: ['read:self'],
  },
  {
    name: 'mentor',
    description: 'Mentor offering sessions',
    isSystem: true,
    permissions: ['read:self'],
  },
];

/**
 * Idempotent seed of the platform roles + their permission sets. Used by both the
 * dev seed script and the e2e test harness so register/login always find roles.
 */
export async function seedRolesAndPermissions(prisma: PrismaClient): Promise<void> {
  for (const roleSeed of SEED_ROLES) {
    const permissionIds: string[] = [];
    for (const name of roleSeed.permissions) {
      const permission = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: `Allows ${name}` },
      });
      permissionIds.push(permission.id);
    }
    await prisma.role.upsert({
      where: { name: roleSeed.name },
      update: {
        description: roleSeed.description,
        isSystem: roleSeed.isSystem,
        permissions: { set: permissionIds.map((id) => ({ id })) },
      },
      create: {
        name: roleSeed.name,
        description: roleSeed.description,
        isSystem: roleSeed.isSystem,
        permissions: { connect: permissionIds.map((id) => ({ id })) },
      },
    });
  }
}
