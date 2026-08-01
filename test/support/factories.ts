import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

export const TEST_PASSWORD = 'Password1';

export interface CreateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  emailVerified?: boolean;
  isActive?: boolean;
}

/**
 * Creates entities directly in the database (bypassing the API) for test setup.
 */
export class TestDataFactory {
  constructor(private readonly prisma: PrismaClient) {}

  async createUser(overrides: CreateUserInput = {}): Promise<User> {
    const roleName = overrides.role ?? 'student';
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new Error(`Role '${roleName}' not seeded`);
    }
    const email = (overrides.email ?? faker.internet.email()).toLowerCase();
    const password = overrides.password ?? TEST_PASSWORD;
    return this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 4),
        fullName: overrides.fullName ?? faker.person.fullName(),
        roleId: role.id,
        emailVerifiedAt: overrides.emailVerified === false ? null : new Date(),
        isActive: overrides.isActive ?? true,
      },
    });
  }

  async createSession(userId: string, overrides: { expiresAt?: Date } = {}): Promise<string> {
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: faker.string.alphanumeric(64),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return session.id;
  }

  findPermission(name: string) {
    return this.prisma.permission.findUnique({ where: { name } });
  }
}
