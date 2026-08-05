import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AwardXpDto,
  ClaimDailyRewardDto,
  GamificationSummaryResponseDto,
} from './dto/gamification.dto';

const DAILY_REWARD_XP = [10, 15, 20, 25, 30, 40, 50]; // day 1–7
const MAX_DAILY_REWARD_DAY = 7;

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Award XP idempotently. Returns the ledger entry (existing or new).
   * Throws if the idempotencyKey is already used with a *different* amount/action.
   */
  async awardXp(
    dto: AwardXpDto,
  ): Promise<{ entry: { id: string; amount: number; createdAt: Date }; levelUp: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      // Idempotency check — if key exists, return existing entry
      const existing = await tx.xpLedger.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        if (existing.amount !== dto.amount || existing.action !== dto.action) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: `Idempotency key already used with different action/amount`,
          });
        }
        return {
          entry: { id: existing.id, amount: existing.amount, createdAt: existing.createdAt },
          levelUp: false,
        };
      }

      // Create ledger entry
      const entry = await tx.xpLedger.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          amount: dto.amount,
          idempotencyKey: dto.idempotencyKey,
          metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });

      // Update streak
      await this.updateStreak(tx, dto.userId);

      // Check for level up
      const totalXp = await this.getTotalXp(tx, dto.userId);
      const levelUp = await this.checkLevelUp(tx, dto.userId, totalXp);

      // Check badge eligibility
      await this.checkBadges(tx, dto.userId, totalXp);

      return { entry: { id: entry.id, amount: entry.amount, createdAt: entry.createdAt }, levelUp };
    });
  }

  /**
   * Claim daily reward for today. Idempotent per user per day.
   */
  async claimDailyReward(userId: string, dto: ClaimDailyRewardDto) {
    const timezone = dto.timezone ?? 'UTC';
    const today = this.getDateInTimezone(timezone);

    return this.prisma.$transaction(async (tx) => {
      // Get or create streak
      let streak = await tx.streak.findUnique({ where: { userId } });
      if (!streak) {
        streak = await tx.streak.create({
          data: { userId, timezone },
        });
      }

      // Check if already claimed today
      const existingClaim = await tx.dailyReward.findFirst({
        where: {
          userId,
          claimedAt: {
            gte: this.startOfDay(today),
            lt: this.endOfDay(today),
          },
        },
      });

      if (existingClaim) {
        throw new ConflictException({
          code: 'DAILY_REWARD_ALREADY_CLAIMED',
          message: 'Daily reward already claimed today',
        });
      }

      // Determine reward day based on current streak
      const rewardDay = Math.min(streak.currentStreak + 1, MAX_DAILY_REWARD_DAY);
      const xpAmount = DAILY_REWARD_XP[rewardDay - 1];

      // Create daily reward record
      const reward = await tx.dailyReward.create({
        data: {
          userId,
          day: rewardDay,
          xpAwarded: xpAmount,
        },
      });

      // Award XP via ledger
      await this.awardXpInternal(tx, {
        userId,
        action: 'daily_reward',
        amount: xpAmount,
        idempotencyKey: `daily_${userId}_${today.toISOString().split('T')[0]}`,
        metadata: { day: rewardDay },
      });

      // Update streak
      await this.updateStreak(tx, userId);

      return {
        day: rewardDay,
        xpAwarded: xpAmount,
        streak: streak.currentStreak + 1,
        claimedAt: reward.claimedAt,
      };
    });
  }

  /**
   * Get gamification summary for a user.
   */
  async getSummary(userId: string): Promise<GamificationSummaryResponseDto> {
    const [user, streak, achievements, dailyRewards, xpAgg] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      this.prisma.streak.findUnique({ where: { userId } }),
      this.prisma.achievement.findMany({
        where: { userId },
        include: { badge: { select: { name: true, icon: true } } },
        orderBy: { earnedAt: 'desc' },
        take: 5,
      }),
      this.prisma.dailyReward.findMany({
        where: { userId },
        orderBy: { claimedAt: 'desc' },
        take: 1,
      }),
      this.prisma.xpLedger.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const totalXp = xpAgg._sum.amount ?? 0;
    const level = await this.getLevelForXp(totalXp);
    const today = this.getDateInTimezone(streak?.timezone ?? 'UTC');
    const todayClaimed =
      dailyRewards.length > 0 && this.isSameDay(dailyRewards[0].claimedAt, today);

    return {
      userId,
      totalXp,
      level: level.level,
      levelTitle: level.title,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      badgesEarned: achievements.length,
      todayClaimed,
      dailyRewardDay: streak ? Math.min(streak.currentStreak + 1, MAX_DAILY_REWARD_DAY) : 1,
      recentAchievements: achievements.map((a) => ({
        id: a.id,
        badgeName: a.badge.name,
        badgeIcon: a.badge.icon,
        earnedAt: a.earnedAt,
      })),
    };
  }

  /**
   * List all badges.
   */
  async listBadges() {
    return this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * List all achievements for a user.
   */
  async listAchievements(userId: string) {
    return this.prisma.achievement.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  /**
   * List active missions.
   */
  async listMissions() {
    return this.prisma.mission.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List active weekly challenges.
   */
  async listWeeklyChallenges() {
    const now = new Date();
    return this.prisma.weeklyChallenge.findMany({
      where: {
        isActive: true,
        weekStart: { lte: now },
        weekEnd: { gte: now },
      },
      orderBy: { weekStart: 'desc' },
    });
  }

  /**
   * List active seasonal events.
   */
  async listSeasonalEvents() {
    const now = new Date();
    return this.prisma.seasonalEvent.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private async awardXpInternal(tx: Prisma.TransactionClient, dto: AwardXpDto) {
    const existing = await tx.xpLedger.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (!existing) {
      await tx.xpLedger.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          amount: dto.amount,
          idempotencyKey: dto.idempotencyKey,
          metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
    }
  }

  private async updateStreak(tx: Prisma.TransactionClient, userId: string) {
    const streak = await tx.streak.findUnique({ where: { userId } });
    if (!streak) return;

    const timezone = streak.timezone ?? 'UTC';
    const today = this.getDateInTimezone(timezone);

    if (!streak.lastActivityDate) {
      // First activity ever
      await tx.streak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        },
      });
      return;
    }

    const lastDate = new Date(streak.lastActivityDate);
    const diffMs = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day — no change to streak count
      return;
    }

    if (diffDays === 1) {
      // Consecutive day — increment streak
      const newStreak = streak.currentStreak + 1;
      await tx.streak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastActivityDate: today,
        },
      });
    } else {
      // Streak broken — reset to 1
      await tx.streak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActivityDate: today,
        },
      });
    }
  }

  private async getTotalXp(tx: Prisma.TransactionClient, userId: string): Promise<number> {
    const agg = await tx.xpLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async getLevelForXp(totalXp: number) {
    const levels = await this.prisma.level.findMany({ orderBy: { level: 'asc' } });
    if (levels.length === 0) {
      return { level: 1, title: 'Novice' };
    }

    let current = levels[0];
    for (const lvl of levels) {
      if (totalXp >= lvl.minXp) {
        current = lvl;
      } else {
        break;
      }
    }
    return { level: current.level, title: current.title };
  }

  private async checkLevelUp(
    tx: Prisma.TransactionClient,
    userId: string,
    totalXp: number,
  ): Promise<boolean> {
    const levels = await tx.level.findMany({ orderBy: { level: 'asc' } });
    if (levels.length === 0) return false;

    // Find the level the user *just* reached
    let reachedLevel = levels[0];
    for (const lvl of levels) {
      if (totalXp >= lvl.minXp) {
        reachedLevel = lvl;
      } else {
        break;
      }
    }

    // Check if user already has an achievement for this level's badge
    const levelBadge = await tx.badge.findFirst({
      where: { name: `Level ${reachedLevel.level}` },
    });

    if (levelBadge) {
      const existing = await tx.achievement.findUnique({
        where: { userId_badgeId: { userId, badgeId: levelBadge.id } },
      });
      if (existing) return false;

      await tx.achievement.create({
        data: { userId, badgeId: levelBadge.id },
      });
      return true;
    }

    return false;
  }

  private async checkBadges(tx: Prisma.TransactionClient, userId: string, totalXp: number) {
    const badges = await tx.badge.findMany();

    for (const badge of badges) {
      const criteria = badge.criteria as Record<string, unknown>;
      if (!this.evaluateBadgeCriteria(criteria, totalXp, userId)) continue;

      const existing = await tx.achievement.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });

      if (!existing) {
        await tx.achievement.create({
          data: { userId, badgeId: badge.id },
        });
      }
    }
  }

  private evaluateBadgeCriteria(
    criteria: Record<string, unknown>,
    totalXp: number,
    _userId: string,
  ): boolean {
    if (criteria.type === 'xp_total' && typeof criteria.threshold === 'number') {
      return totalXp >= criteria.threshold;
    }
    // streak, problems_solved, etc. can be added here
    return false;
  }

  private getDateInTimezone(timezone: string): Date {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((p) => p.type === 'year')?.value ?? now.getUTCFullYear().toString();
      const month =
        parts.find((p) => p.type === 'month')?.value ??
        (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day =
        parts.find((p) => p.type === 'day')?.value ?? now.getUTCDate().toString().padStart(2, '0');
      return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    } catch {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
  }

  private startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private endOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getUTCFullYear() === date2.getUTCFullYear() &&
      date1.getUTCMonth() === date2.getUTCMonth() &&
      date1.getUTCDate() === date2.getUTCDate()
    );
  }
}
