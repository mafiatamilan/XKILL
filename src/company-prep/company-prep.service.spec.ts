import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPrepService } from './company-prep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CompanyPrepService', () => {
  let service: CompanyPrepService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      companyPrepPath: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      hiringPattern: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      interviewQuestion: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      onlineAssessment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      salaryInsight: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      prepTimeline: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as Record<string, Record<string, jest.Mock>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyPrepService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CompanyPrepService);
  });

  describe('createCompany', () => {
    it('creates a company with slug', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue(null);
      prisma.companyPrepPath.create.mockResolvedValue({
        id: 'c1',
        companyName: 'Google',
        slug: 'google',
      });

      const result = await service.createCompany({ companyName: 'Google' });
      expect(result.slug).toBe('google');
      expect(prisma.companyPrepPath.create).toHaveBeenCalled();
    });

    it('throws ConflictException for duplicate company', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', companyName: 'Google' });

      await expect(service.createCompany({ companyName: 'Google' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getFullPrepPath', () => {
    it('returns company with all related data', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({
        id: 'c1',
        companyName: 'Google',
        slug: 'google',
        hiringPatterns: [],
        interviewQuestions: [],
        onlineAssessments: [],
        salaryInsights: [],
        prepTimelines: [],
      });

      const result = await service.getFullPrepPath('google');
      expect(result.slug).toBe('google');
    });

    it('throws NotFoundException for missing company', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue(null);

      await expect(service.getFullPrepPath('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addHiringPattern', () => {
    it('creates a hiring pattern', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.hiringPattern.findUnique.mockResolvedValue(null);
      prisma.hiringPattern.create.mockResolvedValue({
        id: 'h1',
        companyId: 'c1',
        roundName: 'Technical',
        roundOrder: 1,
      });

      const result = await service.addHiringPattern('google', {
        roundName: 'Technical',
        roundOrder: 1,
      });
      expect(result.roundName).toBe('Technical');
      expect(prisma.hiringPattern.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 'c1' }),
        }),
      );
    });

    it('throws ConflictException for duplicate round order', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.hiringPattern.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addHiringPattern('google', { roundName: 'Tech', roundOrder: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addPrepTimeline', () => {
    it('creates a prep timeline week', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.prepTimeline.findUnique.mockResolvedValue(null);
      prisma.prepTimeline.create.mockResolvedValue({
        id: 't1',
        companyId: 'c1',
        weekNumber: 1,
        title: 'Week 1',
      });

      const result = await service.addPrepTimeline('google', {
        weekNumber: 1,
        title: 'Week 1',
      });
      expect(result.weekNumber).toBe(1);
    });

    it('throws ConflictException for duplicate week', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.prepTimeline.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addPrepTimeline('google', { weekNumber: 1, title: 'Week 1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addSalaryInsight', () => {
    it('creates a salary insight', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.salaryInsight.create.mockResolvedValue({
        id: 's1',
        companyId: 'c1',
        role: 'SDE',
        experienceLevel: 'fresher',
        ctcMin: 12,
        ctcMax: 25,
      });

      const result = await service.addSalaryInsight('google', {
        role: 'SDE',
        experienceLevel: 'fresher',
        ctcMin: 12,
        ctcMax: 25,
      });
      expect(result.ctcMin).toBe(12);
      expect(prisma.salaryInsight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 'c1' }),
        }),
      );
    });
  });

  describe('addInterviewQuestion', () => {
    it('creates an interview question', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.interviewQuestion.create.mockResolvedValue({
        id: 'q1',
        companyId: 'c1',
        question: 'What is TCP?',
        category: 'technical',
      });

      const result = await service.addInterviewQuestion('google', {
        question: 'What is TCP?',
        category: 'technical',
      });
      expect(result.category).toBe('technical');
    });
  });

  describe('addOnlineAssessment', () => {
    it('creates an online assessment', async () => {
      prisma.companyPrepPath.findUnique.mockResolvedValue({ id: 'c1', slug: 'google' });
      prisma.onlineAssessment.create.mockResolvedValue({
        id: 'a1',
        companyId: 'c1',
        platform: 'HackerRank',
      });

      const result = await service.addOnlineAssessment('google', {
        platform: 'HackerRank',
        durationMinutes: 90,
      });
      expect(result.platform).toBe('HackerRank');
    });
  });
});
