import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboards.service';
import { LeaderboardRepository } from './leaderboard.repository';
import { RankingService } from '../dsa/ranking.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let repository: jest.Mocked<LeaderboardRepository>;
  let ranking: jest.Mocked<RankingService>;

  beforeEach(async () => {
    const repositoryMock = {
      getCollegeLeaderboard: jest.fn(),
      countCollegeMembers: jest.fn(),
      getDepartmentLeaderboard: jest.fn(),
      countDepartmentMembers: jest.fn(),
      getCompanyLeaderboard: jest.fn(),
      countCompanyMembers: jest.fn(),
      getWeeklyLeaderboard: jest.fn(),
      countWeeklyActive: jest.fn(),
      getMonthlyLeaderboard: jest.fn(),
      countMonthlyActive: jest.fn(),
      getNearbyLeaderboard: jest.fn(),
      countNearbyMembers: jest.fn(),
      getUserCity: jest.fn(),
    };

    const rankingMock = {
      top: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: LeaderboardRepository, useValue: repositoryMock },
        { provide: RankingService, useValue: rankingMock },
      ],
    }).compile();

    service = module.get(LeaderboardService);
    repository = module.get(LeaderboardRepository);
    ranking = module.get(RankingService);
  });

  describe('getGlobal', () => {
    it('returns paginated global leaderboard from Redis', async () => {
      ranking.top.mockResolvedValue([
        { rank: 0, member: 'u1', score: 1500 },
        { rank: 1, member: 'u2', score: 1300 },
      ]);
      ranking.count.mockResolvedValue(50);

      const result = await service.getGlobal(10, 0);

      expect(ranking.top).toHaveBeenCalledWith('dsa:rating:global', 10);
      expect(result.scope).toBe('global');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[1].rank).toBe(2);
      expect(result.meta.total).toBe(50);
    });

    it('applies offset correctly', async () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        rank: i,
        member: `u${i + 1}`,
        score: 1500 - i * 10,
      }));
      ranking.top.mockResolvedValue(entries);
      ranking.count.mockResolvedValue(50);

      const result = await service.getGlobal(10, 10);

      expect(ranking.top).toHaveBeenCalledWith('dsa:rating:global', 20);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].rank).toBe(11);
      expect(result.data[4].rank).toBe(15);
    });
  });

  describe('getCollege', () => {
    it('throws BadRequestException for empty college name', async () => {
      await expect(service.getCollege('', 10, 0)).rejects.toThrow(BadRequestException);
    });

    it('returns college-scoped leaderboard', async () => {
      repository.getCollegeLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', rating: 1400 },
      ]);
      repository.countCollegeMembers.mockResolvedValue(1);

      const result = await service.getCollege('MIT', 10, 0);

      expect(result.scope).toBe('college');
      expect(result.collegeName).toBe('MIT');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].rank).toBe(1);
    });
  });

  describe('getDepartment', () => {
    it('throws BadRequestException for empty department', async () => {
      await expect(service.getDepartment('', 10, 0)).rejects.toThrow(BadRequestException);
    });

    it('returns department-scoped leaderboard', async () => {
      repository.getDepartmentLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', rating: 1400 },
        { userId: 'u2', fullName: 'Bob', rating: 1200 },
      ]);
      repository.countDepartmentMembers.mockResolvedValue(2);

      const result = await service.getDepartment('CS', 10, 0);

      expect(result.scope).toBe('department');
      expect(result.department).toBe('CS');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getCompany', () => {
    it('throws BadRequestException for empty company name', async () => {
      await expect(service.getCompany('', 10, 0)).rejects.toThrow(BadRequestException);
    });

    it('returns company-scoped leaderboard', async () => {
      repository.getCompanyLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', rating: 1400 },
      ]);
      repository.countCompanyMembers.mockResolvedValue(1);

      const result = await service.getCompany('Google', 10, 0);

      expect(result.scope).toBe('company');
      expect(result.companyName).toBe('Google');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getWeekly', () => {
    it('returns weekly leaderboard', async () => {
      repository.getWeeklyLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', totalDelta: 50 },
      ]);
      repository.countWeeklyActive.mockResolvedValue(1);

      const result = await service.getWeekly(10, 0);

      expect(result.scope).toBe('weekly');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].ratingDelta).toBe(50);
    });
  });

  describe('getMonthly', () => {
    it('returns monthly leaderboard', async () => {
      repository.getMonthlyLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', totalDelta: 200 },
      ]);
      repository.countMonthlyActive.mockResolvedValue(1);

      const result = await service.getMonthly(10, 0);

      expect(result.scope).toBe('monthly');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].ratingDelta).toBe(200);
    });
  });

  describe('getNearbyMe', () => {
    it('throws NotFoundException when user has no city', async () => {
      repository.getUserCity.mockResolvedValue(null);

      await expect(service.getNearbyMe('u1', 10, 0)).rejects.toThrow(NotFoundException);
    });

    it('returns nearby leaderboard scoped to user city', async () => {
      repository.getUserCity.mockResolvedValue('Boston');
      repository.getNearbyLeaderboard.mockResolvedValue([
        { userId: 'u1', fullName: 'Alice', rating: 1400 },
      ]);
      repository.countNearbyMembers.mockResolvedValue(1);

      const result = await service.getNearbyMe('u1', 10, 0);

      expect(result.scope).toBe('nearby');
      expect(result.city).toBe('Boston');
      expect(result.data).toHaveLength(1);
    });
  });
});
