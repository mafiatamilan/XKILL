import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import {
  CreateInternshipDto,
  UpdateInternshipDto,
  InternshipSearchQueryDto,
} from './dto/internships.dto';

const INTERN_CERT_PREFIX = 'INT';

@Injectable()
export class InternshipsService {
  private readonly logger = new Logger(InternshipsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createInternship(recruiterId: string, dto: CreateInternshipDto) {
    const company = await this.prisma.companyProfile.findUnique({ where: { id: dto.companyId } });
    if (!company) {
      throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    }
    if (company.userId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_COMPANY_OWNER',
        message: 'You can only post internships for your own company',
      });
    }

    return this.prisma.internshipListing.create({
      data: {
        title: dto.title,
        description: dto.description,
        companyId: dto.companyId,
        recruiterId,
        location: dto.location,
        type: dto.type,
        duration: dto.duration,
        stipend: dto.stipend,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        deadline: new Date(dto.deadline),
      },
      include: { company: { select: { name: true } } },
    });
  }

  async getInternshipById(internshipId: string) {
    const internship = await this.prisma.internshipListing.findUnique({
      where: { id: internshipId },
      include: {
        company: {
          select: { id: true, name: true, logoUrl: true, industry: true, location: true },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!internship) {
      throw new NotFoundException({
        code: 'INTERNSHIP_NOT_FOUND',
        message: 'Internship not found',
      });
    }
    return { ...internship, applicationCount: internship._count.applications };
  }

  async updateInternship(internshipId: string, recruiterId: string, dto: UpdateInternshipDto) {
    const existing = await this.prisma.internshipListing.findUnique({
      where: { id: internshipId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'INTERNSHIP_NOT_FOUND',
        message: 'Internship not found',
      });
    }
    if (existing.recruiterId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_RECRUITER',
        message: 'You can only edit your own internships',
      });
    }

    return this.prisma.internshipListing.update({
      where: { id: internshipId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.location && { location: dto.location }),
        ...(dto.type && { type: dto.type }),
        ...(dto.duration && { duration: dto.duration }),
        ...(dto.stipend !== undefined && { stipend: dto.stipend }),
        ...(dto.deadline && { deadline: new Date(dto.deadline) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { company: { select: { name: true } } },
    });
  }

  async deleteInternship(internshipId: string, recruiterId: string) {
    const existing = await this.prisma.internshipListing.findUnique({
      where: { id: internshipId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'INTERNSHIP_NOT_FOUND',
        message: 'Internship not found',
      });
    }
    if (existing.recruiterId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_RECRUITER',
        message: 'You can only delete your own internships',
      });
    }

    await this.prisma.internshipListing.delete({ where: { id: internshipId } });
    return { deleted: true };
  }

  async searchInternships(query: InternshipSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InternshipListingWhereInput = {
      isActive: true,
      deadline: { gte: new Date() },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.companyId) {
      where.companyId = query.companyId;
    }

    const [data, total] = await Promise.all([
      this.prisma.internshipListing.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, logoUrl: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.internshipListing.count({ where }),
    ]);

    return {
      data: data.map((i) => ({ ...i, applicationCount: i._count.applications })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async applyToInternship(internshipId: string, userId: string, dto: { coverLetter?: string }) {
    const internship = await this.prisma.internshipListing.findUnique({
      where: { id: internshipId },
    });
    if (!internship) {
      throw new NotFoundException({
        code: 'INTERNSHIP_NOT_FOUND',
        message: 'Internship not found',
      });
    }
    if (!internship.isActive || internship.deadline < new Date()) {
      throw new BadRequestException({
        code: 'INTERNSHIP_NOT_ACTIVE',
        message: 'Internship is no longer accepting applications',
      });
    }

    const existing = await this.prisma.internshipApplication.findUnique({
      where: { internshipId_userId: { internshipId, userId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_APPLIED',
        message: 'You have already applied to this internship',
      });
    }

    return this.prisma.internshipApplication.create({
      data: { internshipId, userId, coverLetter: dto.coverLetter },
    });
  }

  async getInternshipCertificate(internshipId: string, userId: string) {
    const certificate = await this.prisma.internshipCertificate.findUnique({
      where: { internshipId_userId: { internshipId, userId } },
      include: { internship: { select: { title: true, company: { select: { name: true } } } } },
    });
    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Internship certificate not found',
      });
    }
    return certificate;
  }

  async issueInternshipCertificate(internshipId: string, userId: string) {
    const internship = await this.prisma.internshipListing.findUnique({
      where: { id: internshipId },
    });
    if (!internship) {
      throw new NotFoundException({
        code: 'INTERNSHIP_NOT_FOUND',
        message: 'Internship not found',
      });
    }

    const existing = await this.prisma.internshipCertificate.findUnique({
      where: { internshipId_userId: { internshipId, userId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CERTIFICATE_EXISTS',
        message: 'Certificate already issued',
      });
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.internshipCertificate.count();
    const seq = (count + 1).toString().padStart(5, '0');
    const certificateNumber = `${INTERN_CERT_PREFIX}-${year}-${seq}`;

    return this.prisma.internshipCertificate.create({
      data: {
        internshipId,
        userId,
        certificateNumber,
        title: `Internship Completion - ${internship.title}`,
        metadata: {
          duration: internship.duration,
          startDate: internship.startDate,
          endDate: internship.endDate,
        },
      },
    });
  }
}
