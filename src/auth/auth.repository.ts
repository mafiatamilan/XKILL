import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const userWithRole = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { role: { include: { permissions: { select: { name: true } } } } },
});
export type UserWithRole = Prisma.UserGetPayload<typeof userWithRole>;

void userWithRole;

export interface DeviceInput {
  name?: string;
  platform?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { select: { name: true } } } } },
    });
  }

  findById(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: { include: { permissions: { select: { name: true } } } } },
    });
  }

  findByIdActive(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: { role: { include: { permissions: { select: { name: true } } } } },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    roleId: string;
  }): Promise<UserWithRole> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        roleId: data.roleId,
      },
      include: { role: { include: { permissions: { select: { name: true } } } } },
    });
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
      include: { permissions: { select: { name: true } } },
    });
  }

  // ---- Sessions ----

  createSession(data: {
    userId: string;
    refreshTokenHash: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return this.prisma.session.create({ data });
  }

  findSessionByTokenHash(refreshTokenHash: string) {
    return this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: {
        user: { include: { role: { include: { permissions: { select: { name: true } } } } } },
      },
    });
  }

  async rotateSession(
    sessionId: string,
    oldHash: string,
    newHash: string,
    now: Date,
    newExpiresAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, refreshTokenHash: oldHash, revokedAt: null },
      data: {
        refreshTokenHash: newHash,
        lastUsedAt: now,
        issuedAt: now,
        expiresAt: newExpiresAt,
      },
    });
    return result.count === 1;
  }

  async revokeSessionByHash(refreshTokenHash: string, now: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count === 1;
  }

  async revokeUserSession(sessionId: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count === 1;
  }

  async revokeAllUserSessions(userId: string, now: Date, exceptHash?: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptHash ? { NOT: { refreshTokenHash: exceptHash } } : {}),
      },
      data: { revokedAt: now },
    });
  }

  listUserSessions(userId: string, skip = 0, take = 20) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      include: { device: true },
      orderBy: { lastUsedAt: 'desc' },
      skip,
      take,
    });
  }

  countUserSessions(userId: string): Promise<number> {
    return this.prisma.session.count({ where: { userId, revokedAt: null } });
  }

  // ---- Devices ----

  async upsertDevice(userId: string, device: DeviceInput): Promise<string | undefined> {
    if (!device.name && !device.platform) {
      return undefined;
    }
    const existing = await this.prisma.device.findFirst({ where: { userId, name: device.name } });
    if (existing) {
      await this.prisma.device.update({
        where: { id: existing.id },
        data: {
          platform: device.platform,
          browser: device.browser,
          os: device.os,
          lastUsedAt: new Date(),
        },
      });
      return existing.id;
    }
    const created = await this.prisma.device.create({
      data: {
        userId,
        name: device.name,
        platform: device.platform,
        browser: device.browser,
        os: device.os,
      },
    });
    return created.id;
  }

  // ---- Email verification ----

  createVerificationToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.emailVerificationToken.create({ data });
  }

  findVerificationTokenByHash(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async consumeVerificationToken(tokenId: string, userId: string, now: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({ where: { id: tokenId }, data: { usedAt: now } }),
      this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } }),
    ]);
  }

  async invalidateVerificationTokens(userId: string, now: Date): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });
  }

  // ---- Password reset ----

  createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.passwordResetToken.create({ data });
  }

  findPasswordResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markResetTokenUsed(tokenId: string, now: Date): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: now } });
  }

  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  // ---- 2FA ----

  async findTwoFactor(userId: string) {
    return this.prisma.twoFactorSecret.findUnique({ where: { userId } });
  }

  async saveTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await this.prisma.twoFactorSecret.upsert({
      where: { userId },
      create: { userId, secret },
      update: { secret, isEnabled: false, verifiedAt: null, disabledAt: null },
    });
  }

  async enableTwoFactor(userId: string, now: Date): Promise<void> {
    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { isEnabled: true, verifiedAt: now, disabledAt: null },
    });
  }

  async disableTwoFactor(userId: string, now: Date): Promise<void> {
    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { isEnabled: false, disabledAt: now },
    });
  }

  // ---- OAuth ----

  findOAuthAccount(provider: string, providerAccountId: string) {
    return this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: {
        user: { include: { role: { include: { permissions: { select: { name: true } } } } } },
      },
    });
  }

  createOAuthAccount(data: {
    userId: string;
    provider: string;
    providerAccountId: string;
    providerEmail?: string;
    profileJson?: object;
  }) {
    return this.prisma.oAuthAccount.create({ data });
  }

  async setUserEmailVerifiedIfNeeded(userId: string, now: Date): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
  }
}
