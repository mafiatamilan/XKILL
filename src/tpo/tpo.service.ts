import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCompanyDriveDto,
  UpdateCompanyDriveDto,
  CreateEligibilityCriteriaDto,
  CreateOfferRecordDto,
  UpdateOfferRecordDto,
  CreateTpoInterviewDto,
  UpdateTpoInterviewDto,
  CreatePlacementReportDto,
} from './dto/tpo.dto';

@Injectable()
export class TpoService {
  private readonly logger = new Logger(TpoService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Dashboard ----------

  async getDashboard() {
    const now = new Date();
    const [totalDrives, upcomingDrives, totalOffers, placedStudents, pendingInterviews] =
      await Promise.all([
        this.prisma.companyDrive.count({ where: { isActive: true } }),
        this.prisma.companyDrive.count({
          where: { isActive: true, status: 'upcoming', deadline: { gte: now } },
        }),
        this.prisma.offerRecord.count(),
        this.prisma.offerRecord.count({ where: { status: { in: ['accepted', 'joined'] } } }),
        this.prisma.tpoInterviewSchedule.count({
          where: { status: 'scheduled', scheduledAt: { gte: now } },
        }),
      ]);

    return {
      totalDrives,
      upcomingDrives,
      totalOffers,
      placedStudents,
      pendingInterviews,
    };
  }

  // ---------- Company Drives CRUD ----------

  async createDrive(dto: CreateCompanyDriveDto) {
    return this.prisma.companyDrive.create({
      data: {
        ...dto,
        deadline: new Date(dto.deadline),
        driveDate: dto.driveDate ? new Date(dto.driveDate) : undefined,
      },
    });
  }

  async listDrives(query: { status?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Record<string, unknown> = { isActive: true };
    if (query.status) {
      where.status = query.status;
    }
    const [data, total] = await Promise.all([
      this.prisma.companyDrive.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { deadline: 'asc' },
        include: { eligibilityCriterias: true },
      }),
      this.prisma.companyDrive.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDrive(id: string) {
    const drive = await this.prisma.companyDrive.findUnique({
      where: { id },
      include: {
        eligibilityCriterias: true,
        offerRecords: {
          include: { student: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!drive) {
      throw new NotFoundException({ code: 'DRIVE_NOT_FOUND', message: 'Drive not found' });
    }
    return drive;
  }

  async updateDrive(id: string, dto: UpdateCompanyDriveDto) {
    await this.assertDrive(id);
    return this.prisma.companyDrive.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        driveDate: dto.driveDate ? new Date(dto.driveDate) : undefined,
      },
    });
  }

  async deleteDrive(id: string) {
    await this.assertDrive(id);
    await this.prisma.companyDrive.delete({ where: { id } });
  }

  // ---------- Eligibility Criteria ----------

  async addEligibility(driveId: string, dto: CreateEligibilityCriteriaDto) {
    await this.assertDrive(driveId);
    return this.prisma.eligibilityCriteria.create({
      data: { ...dto, driveId },
    });
  }

  async listEligibilities(driveId: string) {
    await this.assertDrive(driveId);
    return this.prisma.eligibilityCriteria.findMany({
      where: { driveId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteEligibility(id: string) {
    await this.prisma.eligibilityCriteria.delete({ where: { id } });
  }

  // ---------- Students Eligibility Check ----------

  async checkEligibility(driveId: string) {
    const drive = await this.prisma.companyDrive.findUnique({
      where: { id: driveId },
      include: { eligibilityCriterias: true },
    });
    if (!drive) {
      throw new NotFoundException({ code: 'DRIVE_NOT_FOUND', message: 'Drive not found' });
    }

    // Get all students with their profiles
    const students = await this.prisma.user.findMany({
      where: { role: { name: 'student' }, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentProfile: {
          select: { department: true, expectedGraduationYear: true },
        },
      },
    });

    // Check eligibility against each criteria
    const eligible: typeof students = [];
    const ineligible: Array<(typeof students)[0] & { reason: string }> = [];

    for (const student of students) {
      const profile = student.studentProfile;
      if (!profile) {
        ineligible.push({ ...student, reason: 'No student profile' });
        continue;
      }

      let isEligible = true;
      let reason = '';

      for (const criteria of drive.eligibilityCriterias) {
        if (
          criteria.department &&
          criteria.department !== 'all' &&
          criteria.department !== profile.department
        ) {
          isEligible = false;
          reason = `Department ${profile.department} not eligible (requires ${criteria.department})`;
          break;
        }
        if (
          criteria.passingYear &&
          criteria.passingYear !== String(profile.expectedGraduationYear)
        ) {
          isEligible = false;
          reason = `Graduation year ${profile.expectedGraduationYear} not eligible (requires ${criteria.passingYear})`;
          break;
        }
      }

      if (isEligible) {
        eligible.push(student);
      } else {
        ineligible.push({ ...student, reason });
      }
    }

    return { eligible, ineligible, totalChecked: students.length };
  }

  // ---------- Offer Records ----------

  async createOffer(driveId: string, dto: CreateOfferRecordDto) {
    await this.assertDrive(driveId);
    const existing = await this.prisma.offerRecord.findUnique({
      where: { driveId_studentId: { driveId, studentId: dto.studentId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'OFFER_EXISTS',
        message: 'Offer already exists for this student',
      });
    }
    return this.prisma.offerRecord.create({
      data: { ...dto, driveId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async listOffers(driveId: string, status?: string) {
    await this.assertDrive(driveId);
    return this.prisma.offerRecord.findMany({
      where: { driveId, ...(status ? { status } : {}) },
      orderBy: { offerDate: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateOffer(id: string, dto: UpdateOfferRecordDto) {
    await this.assertOffer(id);
    return this.prisma.offerRecord.update({
      where: { id },
      data: dto,
      include: {
        student: { select: { id: true, fullName: true } },
      },
    });
  }

  // ---------- TPO Interviews ----------

  async createInterview(driveId: string, dto: CreateTpoInterviewDto) {
    await this.assertDrive(driveId);
    return this.prisma.tpoInterviewSchedule.create({
      data: { ...dto, driveId },
      include: {
        candidate: { select: { id: true, fullName: true } },
      },
    });
  }

  async listInterviews(driveId: string, status?: string) {
    await this.assertDrive(driveId);
    return this.prisma.tpoInterviewSchedule.findMany({
      where: { driveId, ...(status ? { status } : {}) },
      orderBy: { scheduledAt: 'asc' },
      include: {
        candidate: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateInterview(id: string, dto: UpdateTpoInterviewDto) {
    await this.assertTpoInterview(id);
    return this.prisma.tpoInterviewSchedule.update({
      where: { id },
      data: dto,
    });
  }

  // ---------- Placement Reports ----------

  async createPlacementReport(dto: CreatePlacementReportDto) {
    const existing = await this.prisma.placementReport.findFirst({
      where: { academicYear: dto.academicYear, department: dto.department ?? null },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REPORT_EXISTS',
        message: 'Placement report already exists for this year/department',
      });
    }
    return this.prisma.placementReport.create({ data: dto });
  }

  async listPlacementReports(academicYear?: string) {
    return this.prisma.placementReport.findMany({
      where: academicYear ? { academicYear } : {},
      orderBy: { academicYear: 'desc' },
    });
  }

  // ---------- Department Stats ----------

  async getDepartmentStats() {
    const departments = await this.prisma.studentProfile.groupBy({
      by: ['department'],
      _count: { id: true },
      where: { department: { not: null } },
    });

    const stats = await Promise.all(
      departments.map(async (dept) => {
        const students = await this.prisma.user.findMany({
          where: {
            role: { name: 'student' },
            studentProfile: { department: dept.department },
            deletedAt: null,
          },
          select: { id: true },
        });
        const studentIds = students.map((s) => s.id);
        const placed = await this.prisma.offerRecord.count({
          where: { studentId: { in: studentIds }, status: { in: ['accepted', 'joined'] } },
        });
        return {
          department: dept.department,
          totalStudents: dept._count.id,
          placedStudents: placed,
          placementRate: dept._count.id > 0 ? Math.round((placed / dept._count.id) * 100) : 0,
        };
      }),
    );

    return stats;
  }

  // ---------- Recruiters Coordination ----------

  async coordinateRecruiter(recruiterId: string, driveId: string) {
    const drive = await this.assertDrive(driveId);
    const recruiter = await this.prisma.recruiterProfile.findUnique({ where: { id: recruiterId } });
    if (!recruiter) {
      throw new NotFoundException({ code: 'RECRUITER_NOT_FOUND', message: 'Recruiter not found' });
    }
    // Link drive to recruiter's company if not set
    if (!drive.companyId && recruiter.companyId) {
      await this.prisma.companyDrive.update({
        where: { id: driveId },
        data: { companyId: recruiter.companyId },
      });
    }
    return { success: true, driveId, recruiterId };
  }

  // ---------- Assertions ----------

  private async assertDrive(id: string) {
    const d = await this.prisma.companyDrive.findUnique({ where: { id } });
    if (!d) throw new NotFoundException({ code: 'DRIVE_NOT_FOUND', message: 'Drive not found' });
    return d;
  }

  private async assertOffer(id: string) {
    const o = await this.prisma.offerRecord.findUnique({ where: { id } });
    if (!o) throw new NotFoundException({ code: 'OFFER_NOT_FOUND', message: 'Offer not found' });
    return o;
  }

  private async assertTpoInterview(id: string) {
    const i = await this.prisma.tpoInterviewSchedule.findUnique({ where: { id } });
    if (!i)
      throw new NotFoundException({ code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found' });
    return i;
  }
}
