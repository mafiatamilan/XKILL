import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: {
    xpLedger: Record<string, jest.Mock>;
    streak: Record<string, jest.Mock>;
    dailyReward: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    achievement: Record<string, jest.Mock>;
    badge: Record<string, jest.Mock>;
    level: Record<string, jest.Mock>;
    mission: Record<string, jest.Mock>;
    weeklyChallenge: Record<string, jest.Mock>;
    seasonalEvent: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      xpLedger: { findUnique: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
      streak: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      dailyReward: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      user: { findUnique: jest.fn() },
      achievement: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      badge: { findMany: jest.fn(), findFirst: jest.fn() },
      level: { findMany: jest.fn() },
      mission: { findMany: jest.fn() },
      weeklyChallenge: { findMany: jest.fn() },
      seasonalEvent: { findMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GamificationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GamificationService);
  });

  describe('awardXp', () => {
    it('awards XP for a new idempotency key', async () => {
      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 50, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue(null);
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

      const result = await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 50,
        idempotencyKey: 'key_123',
      });

      expect(result.entry.amount).toBe(50);
      expect(prisma.xpLedger.create).toHaveBeenCalled();
    });

    it('returns existing entry for duplicate idempotency key with same data', async () => {
      const existing = { id: 'xp1', amount: 50, action: 'problem_solved', createdAt: new Date() };
      prisma.xpLedger.findUnique.mockResolvedValue(existing);

      const result = await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 50,
        idempotencyKey: 'key_123',
      });

      expect(result.entry.id).toBe('xp1');
      expect(prisma.xpLedger.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when idempotency key reused with different amount', async () => {
      const existing = { id: 'xp1', amount: 50, action: 'problem_solved', createdAt: new Date() };
      prisma.xpLedger.findUnique.mockResolvedValue(existing);

      await expect(
        service.awardXp({
          userId: 'u1',
          action: 'problem_solved',
          amount: 100,
          idempotencyKey: 'key_123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when idempotency key reused with different action', async () => {
      const existing = { id: 'xp1', amount: 50, action: 'problem_solved', createdAt: new Date() };
      prisma.xpLedger.findUnique.mockResolvedValue(existing);

      await expect(
        service.awardXp({
          userId: 'u1',
          action: 'contest_won',
          amount: 50,
          idempotencyKey: 'key_123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('streak logic', () => {
    it('creates new streak on first activity', async () => {
      // When no streak exists, updateStreak should return early without calling update
      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 10, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue(null);
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

      await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 10,
        idempotencyKey: 'key_1',
      });

      // No streak to update, so update should not be called
      expect(prisma.streak.update).not.toHaveBeenCalled();
    });

    it('increments streak on consecutive days', async () => {
      // Yesterday at midnight UTC
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 10, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 5,
        lastActivityDate: yesterday,
        timezone: 'UTC',
      });
      prisma.streak.update.mockResolvedValue({});
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 60 } });

      await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 10,
        idempotencyKey: 'key_2',
      });

      expect(prisma.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStreak: 6, longestStreak: 6 }),
        }),
      );
    });

    it('resets streak on non-consecutive days', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 10, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 5,
        lastActivityDate: threeDaysAgo,
        timezone: 'UTC',
      });
      prisma.streak.update.mockResolvedValue({});
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

      await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 10,
        idempotencyKey: 'key_3',
      });

      expect(prisma.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStreak: 1 }),
        }),
      );
    });

    it('does not change streak count on same day', async () => {
      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 10, createdAt: new Date() });
      // Use a date at midnight to match getDateInTimezone output
      const todayMidnight = new Date();
      todayMidnight.setUTCHours(0, 0, 0, 0);
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 3,
        longestStreak: 3,
        lastActivityDate: todayMidnight,
        timezone: 'UTC',
      });
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

      await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 10,
        idempotencyKey: 'key_4',
      });

      expect(prisma.streak.update).not.toHaveBeenCalled();
    });

    it('handles timezone correctly for streak calculation', async () => {
      // Yesterday at midnight in the user's timezone
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 10, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: yesterday,
        timezone: 'America/New_York',
      });
      prisma.streak.update.mockResolvedValue({});
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

      await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 10,
        idempotencyKey: 'key_5',
      });

      expect(prisma.streak.update).toHaveBeenCalled();
    });
  });

  describe('daily rewards', () => {
    it('claims daily reward and awards XP', async () => {
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 2,
        longestStreak: 2,
        timezone: 'UTC',
      });
      prisma.dailyReward.findFirst.mockResolvedValue(null);
      prisma.dailyReward.create.mockResolvedValue({ day: 3, xpAwarded: 20, claimedAt: new Date() });
      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 20, createdAt: new Date() });
      prisma.streak.update.mockResolvedValue({});
      prisma.level.findMany.mockResolvedValue([]);
      prisma.badge.findMany.mockResolvedValue([]);

      const result = await service.claimDailyReward('u1', {});

      expect(result.day).toBe(3);
      expect(result.xpAwarded).toBe(20);
    });

    it('throws ConflictException when daily reward already claimed', async () => {
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 1,
        longestStreak: 1,
        timezone: 'UTC',
      });
      prisma.dailyReward.findFirst.mockResolvedValue({ day: 1, xpAwarded: 10 });

      await expect(service.claimDailyReward('u1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('getSummary', () => {
    it('returns full summary for user with streak and achievements', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.streak.findUnique.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        timezone: 'UTC',
      });
      prisma.achievement.findMany.mockResolvedValue([
        { id: 'a1', earnedAt: new Date(), badge: { name: 'First Blood', icon: 'sword' } },
      ]);
      prisma.dailyReward.findMany.mockResolvedValue([]);
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      prisma.level.findMany.mockResolvedValue([
        { level: 1, minXp: 0, title: 'Novice' },
        { level: 2, minXp: 100, title: 'Coder' },
        { level: 3, minXp: 400, title: 'Warrior' },
      ]);

      const result = await service.getSummary('u1');

      expect(result.totalXp).toBe(500);
      expect(result.level).toBe(3);
      expect(result.levelTitle).toBe('Warrior');
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
      expect(result.recentAchievements).toHaveLength(1);
    });

    it('throws NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSummary('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('level calculation', () => {
    it('awards level-up achievement when reaching new level', async () => {
      prisma.xpLedger.findUnique.mockResolvedValue(null);
      prisma.xpLedger.create.mockResolvedValue({ id: 'xp1', amount: 100, createdAt: new Date() });
      prisma.streak.findUnique.mockResolvedValue(null);
      prisma.level.findMany.mockResolvedValue([
        { level: 1, minXp: 0, title: 'Novice' },
        { level: 2, minXp: 50, title: 'Coder' },
      ]);
      prisma.badge.findMany.mockResolvedValue([]);
      prisma.badge.findFirst.mockResolvedValue({ id: 'badge_level2', name: 'Level 2' });
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({});
      prisma.xpLedger.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

      const result = await service.awardXp({
        userId: 'u1',
        action: 'problem_solved',
        amount: 100,
        idempotencyKey: 'key_levelup',
      });

      expect(result.levelUp).toBe(true);
    });
  });
});
