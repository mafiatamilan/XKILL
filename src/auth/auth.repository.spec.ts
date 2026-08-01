import { PrismaService } from '../prisma/prisma.service';
import { AuthRepository } from './auth.repository';

interface PrismaMock {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  role: { findUnique: jest.Mock };
  session: {
    create: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  device: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock };
  emailVerificationToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  passwordResetToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  twoFactorSecret: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
  oAuthAccount: { findUnique: jest.Mock; create: jest.Mock };
  $transaction: jest.Mock;
}

function mockPrisma(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    device: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    emailVerificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    twoFactorSecret: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe('AuthRepository', () => {
  let prisma: PrismaMock;
  let repository: AuthRepository;

  beforeEach(() => {
    prisma = mockPrisma();
    repository = new AuthRepository(prisma as unknown as PrismaService);
  });

  it('looks up users by email with their role', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await repository.findByEmail('a@b.com');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'a@b.com' } }),
    );
  });

  it('creates users with the provided role', async () => {
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    await repository.createUser({
      email: 'a@b.com',
      passwordHash: 'h',
      fullName: 'A',
      roleId: 'r1',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: 'a@b.com', passwordHash: 'h', fullName: 'A', roleId: 'r1' },
      }),
    );
  });

  describe('session rotation', () => {
    it('returns true when exactly one row rotated', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });
      await expect(
        repository.rotateSession('s1', 'old', 'new', new Date(), new Date()),
      ).resolves.toBe(true);
    });

    it('returns false when rotation touched nothing (reuse race)', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        repository.rotateSession('s1', 'old', 'new', new Date(), new Date()),
      ).resolves.toBe(false);
    });

    it('matches only the expected old hash on an unrevoked session', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });
      await repository.rotateSession('s1', 'old', 'new', new Date(), new Date());
      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1', refreshTokenHash: 'old', revokedAt: null },
        }),
      );
    });
  });

  it('revokes a session by hash only if unrevoked', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    await expect(repository.revokeSessionByHash('h', new Date())).resolves.toBe(true);
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { refreshTokenHash: 'h', revokedAt: null } }),
    );
  });

  it('revokes all sessions for a user, optionally excluding one', async () => {
    await repository.revokeAllUserSessions('u1', new Date(), 'keep-hash');
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', revokedAt: null, NOT: { refreshTokenHash: 'keep-hash' } },
      }),
    );
  });

  it('revokes every session when no exclusion hash is given', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    await repository.revokeAllUserSessions('u1', new Date());
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
    );
  });

  it('lists only active sessions with device info', async () => {
    prisma.session.findMany.mockResolvedValue([]);
    await repository.listUserSessions('u1', 5, 10);
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null }, skip: 5, take: 10 }),
    );
  });

  it('lists sessions with default pagination', async () => {
    prisma.session.findMany.mockResolvedValue([]);
    await repository.listUserSessions('u1');
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  describe('upsertDevice', () => {
    it('returns undefined when the device has no identity fields', async () => {
      await expect(repository.upsertDevice('u1', {})).resolves.toBeUndefined();
      await expect(repository.upsertDevice('u1', { name: undefined })).resolves.toBeUndefined();
    });

    it('updates and reuses an existing device', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'd1' });
      const id = await repository.upsertDevice('u1', { name: 'Chrome', platform: 'web' });
      expect(id).toBe('d1');
      expect(prisma.device.update).toHaveBeenCalled();
    });

    it('creates a new device when none exists', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd2' });
      const id = await repository.upsertDevice('u1', { name: 'Chrome', platform: 'web' });
      expect(id).toBe('d2');
      expect(prisma.device.create).toHaveBeenCalled();
    });
  });

  it('consumes a verification token inside a transaction', async () => {
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      for (const op of ops as Array<{ then?: unknown }>) {
        await op;
      }
      return [];
    });
    prisma.emailVerificationToken.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    await repository.consumeVerificationToken('t1', 'u1', new Date());
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('saves a two-factor secret via upsert and resets state', async () => {
    prisma.twoFactorSecret.upsert.mockResolvedValue({});
    await repository.saveTwoFactorSecret('u1', 'secret');
    expect(prisma.twoFactorSecret.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        create: { userId: 'u1', secret: 'secret' },
      }),
    );
  });

  it('marks email verified when not yet verified', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    await repository.setUserEmailVerifiedIfNeeded('u1', new Date());
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1', emailVerifiedAt: null } }),
    );
  });

  it('looks up OAuth accounts by composite key', async () => {
    prisma.oAuthAccount.findUnique.mockResolvedValue(null);
    await repository.findOAuthAccount('google', 'acc-1');
    expect(prisma.oAuthAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'acc-1' } },
      }),
    );
  });
});
