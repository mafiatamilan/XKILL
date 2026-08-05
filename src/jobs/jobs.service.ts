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
import { CreateJobListingDto, UpdateJobListingDto, JobSearchQueryDto } from './dto/jobs.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createJob(recruiterId: string, dto: CreateJobListingDto) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Company profile not found',
      });
    }
    if (company.userId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_COMPANY_OWNER',
        message: 'You can only post jobs for your own company',
      });
    }

    const job = await this.prisma.jobListing.create({
      data: {
        title: dto.title,
        description: dto.description,
        companyId: dto.companyId,
        recruiterId,
        location: dto.location,
        type: dto.type,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        requirements: dto.requirements ?? [],
        skills: dto.skills ?? [],
        deadline: new Date(dto.deadline),
      },
      include: { company: { select: { name: true } } },
    });

    this.logger.log(`Job created: ${job.id} by recruiter ${recruiterId}`);
    return job;
  }

  async getJobById(jobId: string) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: { id: true, name: true, logoUrl: true, industry: true, location: true },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!job) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }
    return { ...job, applicationCount: job._count.applications };
  }

  async updateJob(jobId: string, recruiterId: string, dto: UpdateJobListingDto) {
    const existing = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!existing) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }
    if (existing.recruiterId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_RECRUITER',
        message: 'You can only edit your own job listings',
      });
    }

    return this.prisma.jobListing.update({
      where: { id: jobId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.location && { location: dto.location }),
        ...(dto.type && { type: dto.type }),
        ...(dto.salaryMin !== undefined && { salaryMin: dto.salaryMin }),
        ...(dto.salaryMax !== undefined && { salaryMax: dto.salaryMax }),
        ...(dto.requirements && { requirements: dto.requirements }),
        ...(dto.skills && { skills: dto.skills }),
        ...(dto.deadline && { deadline: new Date(dto.deadline) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { company: { select: { name: true } } },
    });
  }

  async deleteJob(jobId: string, recruiterId: string) {
    const existing = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!existing) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }
    if (existing.recruiterId !== recruiterId) {
      throw new BadRequestException({
        code: 'NOT_RECRUITER',
        message: 'You can only delete your own job listings',
      });
    }

    await this.prisma.jobListing.delete({ where: { id: jobId } });
    return { deleted: true };
  }

  async searchJobs(query: JobSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.JobListingWhereInput = {
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
    if (query.skill) {
      where.skills = { has: query.skill };
    }

    const [data, total] = await Promise.all([
      this.prisma.jobListing.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, logoUrl: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jobListing.count({ where }),
    ]);

    return {
      data: data.map((j) => ({ ...j, applicationCount: j._count.applications })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async applyToJob(jobId: string, userId: string, dto: { coverLetter?: string }) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }
    if (!job.isActive || job.deadline < new Date()) {
      throw new BadRequestException({
        code: 'JOB_NOT_ACTIVE',
        message: 'Job is no longer accepting applications',
      });
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_APPLIED',
        message: 'You have already applied to this job',
      });
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        coverLetter: dto.coverLetter,
      },
    });
  }

  async listMyApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { userId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            type: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async saveJob(jobId: string, userId: string) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }

    const existing = await this.prisma.savedJob.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) {
      throw new ConflictException({ code: 'ALREADY_SAVED', message: 'Job already saved' });
    }

    return this.prisma.savedJob.create({
      data: { jobId, userId },
    });
  }

  async unsaveJob(jobId: string, userId: string) {
    const existing = await this.prisma.savedJob.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'SAVED_JOB_NOT_FOUND', message: 'Saved job not found' });
    }

    await this.prisma.savedJob.delete({
      where: { jobId_userId: { jobId, userId } },
    });
    return { deleted: true };
  }

  async checkEligibility(jobId: string, userId: string) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
      select: { id: true, requirements: true, skills: true },
    });
    if (!job) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { department: true, collegeName: true },
    });

    const eligible = true;
    const reasons: string[] = [];

    // Basic eligibility check — can be expanded with actual student data
    if (!profile) {
      reasons.push('No student profile found — complete your profile to check eligibility');
    }

    return {
      jobId,
      userId,
      eligible,
      requirements: job.requirements,
      requiredSkills: job.skills,
      reasons,
    };
  }

  async getCompanyProfile(companyId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { id: companyId },
      include: {
        _count: { select: { jobListings: { where: { isActive: true } } } },
      },
    });
    if (!company) {
      throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    }
    return { ...company, activeJobCount: company._count.jobListings };
  }

  async contactRecruiter(jobId: string, _userId: string) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
      include: {
        recruiter: { select: { id: true, fullName: true, email: true } },
        company: { select: { name: true } },
      },
    });
    if (!job) {
      throw new NotFoundException({ code: 'JOB_NOT_FOUND', message: 'Job listing not found' });
    }

    return {
      recruiterName: job.recruiter.fullName,
      recruiterEmail: job.recruiter.email,
      companyName: job.company.name,
      jobTitle: job.title,
    };
  }
}
