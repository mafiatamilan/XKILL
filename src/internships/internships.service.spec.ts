import { Test, TestingModule } from '@nestjs/testing';
import { InternshipsService } from './internships.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('InternshipsService', () => {
  let service: InternshipsService;
  let prisma: {
    companyProfile: Record<string, jest.Mock>;
    internshipListing: Record<string, jest.Mock>;
    internshipApplication: Record<string, jest.Mock>;
    internshipCertificate: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      companyProfile: { findUnique: jest.fn() },
      internshipListing: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      internshipApplication: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      internshipCertificate: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InternshipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(InternshipsService);
  });

  describe('createInternship', () => {
    it('creates an internship when recruiter owns the company', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue({ id: 'c1', userId: 'r1' });
      prisma.internshipListing.create.mockResolvedValue({
        id: 'i1',
        title: 'Summer Intern',
        companyId: 'c1',
        company: { name: 'Acme' },
      });

      const result = await service.createInternship('r1', {
        title: 'Summer Intern',
        description: 'Build things',
        companyId: 'c1',
        location: 'Remote',
        type: 'summer',
        duration: '3 months',
        deadline: '2026-06-01',
      });

      expect(result.id).toBe('i1');
    });

    it('throws when recruiter does not own the company', async () => {
      prisma.companyProfile.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });

      await expect(
        service.createInternship('r1', {
          title: 'Intern',
          description: 'Desc',
          companyId: 'c1',
          location: 'Remote',
          type: 'summer',
          duration: '3 months',
          deadline: '2026-06-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyToInternship', () => {
    it('creates application for active internship', async () => {
      prisma.internshipListing.findUnique.mockResolvedValue({
        id: 'i1',
        isActive: true,
        deadline: new Date('2026-12-31'),
      });
      prisma.internshipApplication.findUnique.mockResolvedValue(null);
      prisma.internshipApplication.create.mockResolvedValue({ id: 'a1' });

      const result = await service.applyToInternship('i1', 'u1', { coverLetter: 'Hire me' });
      expect(result.id).toBe('a1');
    });

    it('throws ConflictException on duplicate application', async () => {
      prisma.internshipListing.findUnique.mockResolvedValue({
        id: 'i1',
        isActive: true,
        deadline: new Date('2026-12-31'),
      });
      prisma.internshipApplication.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.applyToInternship('i1', 'u1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('getInternshipCertificate', () => {
    it('returns certificate for completed internship', async () => {
      prisma.internshipCertificate.findUnique.mockResolvedValue({
        id: 'cert1',
        certificateNumber: 'INT-2026-00001',
        internship: { title: 'Summer Intern', company: { name: 'Acme' } },
      });

      const result = await service.getInternshipCertificate('i1', 'u1');
      expect(result.certificateNumber).toBe('INT-2026-00001');
    });

    it('throws when certificate not found', async () => {
      prisma.internshipCertificate.findUnique.mockResolvedValue(null);

      await expect(service.getInternshipCertificate('i1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('issueInternshipCertificate', () => {
    it('issues a certificate with unique number', async () => {
      prisma.internshipListing.findUnique.mockResolvedValue({
        id: 'i1',
        title: 'Summer Intern',
        duration: '3 months',
        startDate: null,
        endDate: null,
      });
      prisma.internshipCertificate.findUnique.mockResolvedValue(null);
      prisma.internshipCertificate.count.mockResolvedValue(0);
      prisma.internshipCertificate.create.mockResolvedValue({
        id: 'cert1',
        certificateNumber: 'INT-2026-00001',
      });

      const result = await service.issueInternshipCertificate('i1', 'u1');
      expect(result.certificateNumber).toMatch(/^INT-/);
    });

    it('throws when certificate already exists', async () => {
      prisma.internshipListing.findUnique.mockResolvedValue({ id: 'i1', title: 'Intern' });
      prisma.internshipCertificate.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.issueInternshipCertificate('i1', 'u1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('searchInternships', () => {
    it('returns paginated results', async () => {
      prisma.internshipListing.findMany.mockResolvedValue([
        {
          id: 'i1',
          title: 'Intern',
          _count: { applications: 3 },
          company: { id: 'c1', name: 'Acme', logoUrl: null },
        },
      ]);
      prisma.internshipListing.count.mockResolvedValue(1);

      const result = await service.searchInternships({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
