import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  rating: number;
  collegeName: string | null;
  department: string | null;
}

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCollegeLeaderboard(collegeName: string, limit: number, offset: number) {
    const entries = await this.prisma.$queryRaw<
      Array<{ userId: string; fullName: string; rating: number }>
    >`
      SELECT cr."userId", u."fullName", cr."rating"
      FROM "CodingRating" cr
      JOIN "User" u ON u.id = cr."userId"
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."collegeName" = ${collegeName}
      ORDER BY cr."rating" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return entries;
  }

  async countCollegeMembers(collegeName: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "CodingRating" cr
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."collegeName" = ${collegeName}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async getDepartmentLeaderboard(department: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<Array<{ userId: string; fullName: string; rating: number }>>`
      SELECT cr."userId", u."fullName", cr."rating"
      FROM "CodingRating" cr
      JOIN "User" u ON u.id = cr."userId"
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."department" = ${department}
      ORDER BY cr."rating" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async countDepartmentMembers(department: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "CodingRating" cr
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."department" = ${department}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async getCompanyLeaderboard(companyName: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<Array<{ userId: string; fullName: string; rating: number }>>`
      SELECT cr."userId", u."fullName", cr."rating"
      FROM "CodingRating" cr
      JOIN "User" u ON u.id = cr."userId"
      JOIN "CareerGoal" cg ON cg."userId" = cr."userId"
      WHERE ${companyName} = ANY(cg."targetCompanies")
      ORDER BY cr."rating" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async countCompanyMembers(companyName: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "CodingRating" cr
      JOIN "CareerGoal" cg ON cg."userId" = cr."userId"
      WHERE ${companyName} = ANY(cg."targetCompanies")
    `;
    return Number(result[0]?.count ?? 0);
  }

  async getWeeklyLeaderboard(limit: number, offset: number) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.prisma.$queryRaw<Array<{ userId: string; fullName: string; totalDelta: number }>>`
      SELECT crh."userId", u."fullName", SUM(crh."delta") as "totalDelta"
      FROM "CodingRatingHistory" crh
      JOIN "User" u ON u.id = crh."userId"
      WHERE crh."createdAt" >= ${weekAgo}
      GROUP BY crh."userId", u."fullName"
      ORDER BY "totalDelta" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async countWeeklyActive(): Promise<number> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "CodingRatingHistory"
      WHERE "createdAt" >= ${weekAgo}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async getMonthlyLeaderboard(limit: number, offset: number) {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.prisma.$queryRaw<Array<{ userId: string; fullName: string; totalDelta: number }>>`
      SELECT crh."userId", u."fullName", SUM(crh."delta") as "totalDelta"
      FROM "CodingRatingHistory" crh
      JOIN "User" u ON u.id = crh."userId"
      WHERE crh."createdAt" >= ${monthAgo}
      GROUP BY crh."userId", u."fullName"
      ORDER BY "totalDelta" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async countMonthlyActive(): Promise<number> {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "CodingRatingHistory"
      WHERE "createdAt" >= ${monthAgo}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async getUserCity(userId: string): Promise<string | null> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { city: true },
    });
    return profile?.city ?? null;
  }

  async getNearbyLeaderboard(city: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<Array<{ userId: string; fullName: string; rating: number }>>`
      SELECT cr."userId", u."fullName", cr."rating"
      FROM "CodingRating" cr
      JOIN "User" u ON u.id = cr."userId"
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."city" = ${city}
      ORDER BY cr."rating" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async countNearbyMembers(city: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "CodingRating" cr
      JOIN "StudentProfile" sp ON sp."userId" = cr."userId"
      WHERE sp."city" = ${city}
    `;
    return Number(result[0]?.count ?? 0);
  }
}
