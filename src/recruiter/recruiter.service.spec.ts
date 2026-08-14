import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterService } from './recruiter.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('RecruiterService', () => {
  let service: RecruiterService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      recruiterProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      jobListing: { count: jest.fn() },
      jobApplication: { count: jest.fn() },
      interviewSchedule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      shortlist: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    } as unknown as Record<string, Record<string, jest.Mock>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecruiterService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RecruiterService);
  });

  describe('createProfile', () => {
    it('creates a recruiter profile', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);
      prisma.recruiterProfile.create.mockResolvedValue({
        id: 'rp1',
        userId: 'u1',
        jobTitle: 'Senior Recruiter',
      });

      const result = await service.createProfile('u1', { jobTitle: 'Senior Recruiter' });
      expect(result.jobTitle).toBe('Senior Recruiter');
    });

    it('throws ConflictException for duplicate profile', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1' });

      await expect(service.createProfile('u1', { jobTitle: 'Test' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getProfile', () => {
    it('returns profile with company', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rp1',
        userId: 'u1',
        company: { id: 'c1', name: 'Google' },
      });

      const result = await service.getProfile('u1');
      expect(result.company?.name).toBe('Google');
    });

    it('throws NotFoundException for missing profile', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('shortlistCandidate', () => {
    it('shortlists a candidate', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1', userId: 'u1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'c1', fullName: 'John' });
      prisma.shortlist.findFirst.mockResolvedValue(null);
      prisma.shortlist.create.mockResolvedValue({
        id: 's1',
        recruiterId: 'rp1',
        candidateId: 'c1',
        status: 'shortlisted',
      });

      const result = await service.shortlistCandidate('u1', 'c1', {});
      expect(result.status).toBe('shortlisted');
    });

    it('throws ConflictException for duplicate shortlist', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1', userId: 'u1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.shortlist.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.shortlistCandidate('u1', 'c1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('createInterview', () => {
    it('creates an interview', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1', userId: 'u1' });
      prisma.interviewSchedule.create.mockResolvedValue({
        id: 'i1',
        recruiterId: 'rp1',
        candidateId: 'c1',
        scheduledAt: new Date(),
      });

      const result = await service.createInterview('u1', {
        candidateId: 'c1',
        scheduledAt: '2026-08-20T10:00:00.000Z',
      });
      expect(result.candidateId).toBe('c1');
    });
  });

  describe('updateInterview', () => {
    it('updates own interview', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1', userId: 'u1' });
      prisma.interviewSchedule.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'rp1',
        status: 'scheduled',
      });
      prisma.interviewSchedule.update.mockResolvedValue({
        id: 'i1',
        status: 'completed',
        rating: 5,
      });

      const result = await service.updateInterview('i1', 'u1', {
        status: 'completed',
        rating: 5,
      });
      expect(result.rating).toBe(5);
    });

    it('throws ForbiddenException for other recruiter interview', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({ id: 'rp1', userId: 'u1' });
      prisma.interviewSchedule.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'rp_other',
      });

      await expect(service.updateInterview('i1', 'u1', { status: 'completed' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
