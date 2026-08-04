import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RankingService } from '../dsa/ranking.service';
import { LeaderboardRepository } from './leaderboard.repository';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';

const RATING_KEY = 'dsa:rating:global';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly repository: LeaderboardRepository,
    private readonly ranking: RankingService,
  ) {}

  async getGlobal(limit: number, offset: number) {
    const entries = await this.ranking.top(RATING_KEY, offset + limit);
    const sliced = entries.slice(offset);
    const total = await this.ranking.count(RATING_KEY);
    return {
      scope: 'global',
      data: sliced.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.member,
        score: entry.score,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getCollege(collegeName: string, limit: number, offset: number) {
    if (!collegeName) {
      throw new BadRequestException({
        code: 'MISSING_COLLEGE',
        message: 'College name is required',
      });
    }
    const [data, total] = await Promise.all([
      this.repository.getCollegeLeaderboard(collegeName, limit, offset),
      this.repository.countCollegeMembers(collegeName),
    ]);
    return {
      scope: 'college',
      collegeName,
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        rating: entry.rating,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getDepartment(department: string, limit: number, offset: number) {
    if (!department) {
      throw new BadRequestException({
        code: 'MISSING_DEPARTMENT',
        message: 'Department is required',
      });
    }
    const [data, total] = await Promise.all([
      this.repository.getDepartmentLeaderboard(department, limit, offset),
      this.repository.countDepartmentMembers(department),
    ]);
    return {
      scope: 'department',
      department,
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        rating: entry.rating,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getCompany(companyName: string, limit: number, offset: number) {
    if (!companyName) {
      throw new BadRequestException({
        code: 'MISSING_COMPANY',
        message: 'Company name is required',
      });
    }
    const [data, total] = await Promise.all([
      this.repository.getCompanyLeaderboard(companyName, limit, offset),
      this.repository.countCompanyMembers(companyName),
    ]);
    return {
      scope: 'company',
      companyName,
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        rating: entry.rating,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getWeekly(limit: number, offset: number) {
    const [data, total] = await Promise.all([
      this.repository.getWeeklyLeaderboard(limit, offset),
      this.repository.countWeeklyActive(),
    ]);
    return {
      scope: 'weekly',
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        ratingDelta: entry.totalDelta,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getMonthly(limit: number, offset: number) {
    const [data, total] = await Promise.all([
      this.repository.getMonthlyLeaderboard(limit, offset),
      this.repository.countMonthlyActive(),
    ]);
    return {
      scope: 'monthly',
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        ratingDelta: entry.totalDelta,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }

  async getNearbyMe(userId: string, limit: number, offset: number) {
    const city = await this.repository.getUserCity(userId);
    if (!city) {
      throw new NotFoundException({
        code: 'NO_CITY_SET',
        message: 'Set your city in your student profile to use nearby leaderboards',
      });
    }
    const [data, total] = await Promise.all([
      this.repository.getNearbyLeaderboard(city, limit, offset),
      this.repository.countNearbyMembers(city),
    ]);
    return {
      scope: 'nearby',
      city,
      data: data.map((entry, i) => ({
        rank: offset + i + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        rating: entry.rating,
      })),
      meta: buildPaginationMeta(total, Math.floor(offset / limit) + 1, limit),
    };
  }
}
