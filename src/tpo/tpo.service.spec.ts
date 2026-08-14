import { Test, TestingModule } from '@nestjs/testing';
import { TpoService } from './tpo.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TpoService', () => {
  let service: TpoService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      companyDrive: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      eligibilityCriteria: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      offerRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tpoInterviewSchedule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      placementReport: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      studentProfile: {
        groupBy: jest.fn(),
      },
      recruiterProfile: {
        findUnique: jest.fn(),
      },
    } as unknown as Record<string, Record<string, jest.Mock>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TpoService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TpoService);
  });

  describe('createDrive', () => {
    it('creates a company drive', async () => {
      prisma.companyDrive.create.mockResolvedValue({
        id: 'd1',
        companyName: 'Google',
        title: 'Campus Drive',
        deadline: new Date(),
      });

      const result = await service.createDrive({
        companyName: 'Google',
        title: 'Campus Drive',
        deadline: '2026-09-30',
      });
      expect(result.companyName).toBe('Google');
    });
  });

  describe('getDrive', () => {
    it('returns drive with eligibility and offers', async () => {
      prisma.companyDrive.findUnique.mockResolvedValue({
        id: 'd1',
        companyName: 'Google',
        eligibilityCriterias: [],
        offerRecords: [],
      });

      const result = await service.getDrive('d1');
      expect(result.companyName).toBe('Google');
    });

    it('throws NotFoundException for missing drive', async () => {
      prisma.companyDrive.findUnique.mockResolvedValue(null);

      await expect(service.getDrive('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOffer', () => {
    it('creates an offer record', async () => {
      prisma.companyDrive.findUnique.mockResolvedValue({ id: 'd1' });
      prisma.offerRecord.findUnique.mockResolvedValue(null);
      prisma.offerRecord.create.mockResolvedValue({
        id: 'o1',
        driveId: 'd1',
        studentId: 's1',
        role: 'SDE',
        ctcLakhs: 18,
        status: 'offered',
      });

      const result = await service.createOffer('d1', {
        studentId: 's1',
        role: 'SDE',
        ctcLakhs: 18,
      });
      expect(result.ctcLakhs).toBe(18);
    });

    it('throws ConflictException for duplicate offer', async () => {
      prisma.companyDrive.findUnique.mockResolvedValue({ id: 'd1' });
      prisma.offerRecord.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createOffer('d1', { studentId: 's1', role: 'SDE', ctcLakhs: 18 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createPlacementReport', () => {
    it('creates a placement report', async () => {
      prisma.placementReport.findFirst.mockResolvedValue(null);
      prisma.placementReport.create.mockResolvedValue({
        id: 'r1',
        academicYear: '2025-2026',
        department: 'CS',
        totalStudents: 120,
        placedStudents: 85,
      });

      const result = await service.createPlacementReport({
        academicYear: '2025-2026',
        department: 'CS',
        totalStudents: 120,
        eligibleStudents: 100,
        placedStudents: 85,
        offersMade: 90,
      });
      expect(result.placedStudents).toBe(85);
    });

    it('throws ConflictException for duplicate report', async () => {
      prisma.placementReport.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createPlacementReport({
          academicYear: '2025-2026',
          department: 'CS',
          totalStudents: 120,
          eligibleStudents: 100,
          placedStudents: 85,
          offersMade: 90,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkEligibility', () => {
    it('checks student eligibility', async () => {
      prisma.companyDrive.findUnique.mockResolvedValue({
        id: 'd1',
        eligibilityCriterias: [{ department: 'CS', passingYear: '2026' }],
      });
      prisma.user.findMany.mockResolvedValue([
        {
          id: 's1',
          fullName: 'John',
          studentProfile: { department: 'CS', expectedGraduationYear: 2026 },
        },
        {
          id: 's2',
          fullName: 'Jane',
          studentProfile: { department: 'IT', expectedGraduationYear: 2026 },
        },
      ]);

      const result = await service.checkEligibility('d1');
      expect(result.eligible.length).toBe(1);
      expect(result.ineligible.length).toBe(1);
      expect(result.totalChecked).toBe(2);
    });
  });
});
