import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: {
    companyProfile: Record<string, jest.Mock>;
    jobListing: Record<string, jest.Mock>;
    jobApplication: Record<string, jest.Mock>;
    savedJob: Record<string, jest.Mock>;
    studentProfile: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      companyProfile: { findUnique: jest.fn() },
      jobListing: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jobApplication: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      savedJob: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      studentProfile: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(JobsService);
  });

  describe('createJob', () => {
    it('creates a job when recruiter owns the company', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue({ id: 'c1', userId: 'r1' });
      prisma.jobListing.create.mockResolvedValue({
        id: 'j1',
        title: 'Frontend Dev',
        companyId: 'c1',
        recruiterId: 'r1',
        company: { name: 'Acme' },
      });

      const result = await service.createJob('r1', {
        title: 'Frontend Dev',
        description: 'Build UIs',
        companyId: 'c1',
        location: 'Bangalore',
        type: 'full_time',
        deadline: '2026-12-31',
      });

      expect(result.id).toBe('j1');
      expect(prisma.jobListing.create).toHaveBeenCalled();
    });

    it('throws when recruiter does not own the company', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });

      await expect(
        service.createJob('r1', {
          title: 'Dev',
          description: 'Desc',
          companyId: 'c1',
          location: 'Remote',
          type: 'full_time',
          deadline: '2026-12-31',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when company not found', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createJob('r1', {
          title: 'Dev',
          description: 'Desc',
          companyId: 'bad',
          location: 'Remote',
          type: 'full_time',
          deadline: '2026-12-31',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyToJob', () => {
    it('creates application for active job', async () => {
      prisma.jobListing.findUnique.mockResolvedValue({
        id: 'j1',
        isActive: true,
        deadline: new Date('2026-12-31'),
      });
      prisma.jobApplication.findUnique.mockResolvedValue(null);
      prisma.jobApplication.create.mockResolvedValue({ id: 'a1', jobId: 'j1', userId: 'u1' });

      const result = await service.applyToJob('j1', 'u1', { coverLetter: 'Hire me' });
      expect(result.id).toBe('a1');
    });

    it('throws ConflictException on duplicate application', async () => {
      prisma.jobListing.findUnique.mockResolvedValue({
        id: 'j1',
        isActive: true,
        deadline: new Date('2026-12-31'),
      });
      prisma.jobApplication.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.applyToJob('j1', 'u1', {})).rejects.toThrow(ConflictException);
    });

    it('throws when job is not active', async () => {
      prisma.jobListing.findUnique.mockResolvedValue({
        id: 'j1',
        isActive: false,
        deadline: new Date('2026-12-31'),
      });

      await expect(service.applyToJob('j1', 'u1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveJob / unsaveJob', () => {
    it('saves a job', async () => {
      prisma.jobListing.findUnique.mockResolvedValue({ id: 'j1' });
      prisma.savedJob.findUnique.mockResolvedValue(null);
      prisma.savedJob.create.mockResolvedValue({ id: 's1' });

      const result = await service.saveJob('j1', 'u1');
      expect(result.id).toBe('s1');
    });

    it('throws on duplicate save', async () => {
      prisma.jobListing.findUnique.mockResolvedValue({ id: 'j1' });
      prisma.savedJob.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.saveJob('j1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('unsaves a job', async () => {
      prisma.savedJob.findUnique.mockResolvedValue({ id: 's1' });
      prisma.savedJob.delete.mockResolvedValue({});

      const result = await service.unsaveJob('j1', 'u1');
      expect(result.deleted).toBe(true);
    });

    it('throws when saved job not found', async () => {
      prisma.savedJob.findUnique.mockResolvedValue(null);

      await expect(service.unsaveJob('j1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchJobs', () => {
    it('returns paginated results', async () => {
      prisma.jobListing.findMany.mockResolvedValue([
        {
          id: 'j1',
          title: 'Dev',
          _count: { applications: 5 },
          company: { id: 'c1', name: 'Acme', logoUrl: null },
        },
      ]);
      prisma.jobListing.count.mockResolvedValue(1);

      const result = await service.searchJobs({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getCompanyProfile', () => {
    it('returns company with active job count', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Acme',
        _count: { jobListings: 3 },
      });

      const result = await service.getCompanyProfile('c1');
      expect(result.activeJobCount).toBe(3);
    });

    it('throws when company not found', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue(null);

      await expect(service.getCompanyProfile('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
