import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRecruiterProfileDto,
  UpdateRecruiterProfileDto,
  CreateShortlistDto,
  UpdateShortlistStatusDto,
  CreateInterviewScheduleDto,
  UpdateInterviewScheduleDto,
} from './dto/recruiter.dto';

@Injectable()
export class RecruiterService {
  private readonly logger = new Logger(RecruiterService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Recruiter Profile ----------

  async createProfile(userId: string, dto: CreateRecruiterProfileDto) {
    const existing = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException({
        code: 'PROFILE_EXISTS',
        message: 'Recruiter profile already exists',
      });
    }
    return this.prisma.recruiterProfile.create({
      data: { userId, ...dto },
      include: { company: true },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { company: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Recruiter profile not found',
      });
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.recruiterProfile.update({
      where: { id: profile.id },
      data: dto,
      include: { company: true },
    });
  }

  // ---------- Dashboard ----------

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const companyId = profile.companyId;

    const [totalJobs, totalApplications, upcomingInterviews, recentShortlists] = await Promise.all([
      companyId ? this.prisma.jobListing.count({ where: { companyId, isActive: true } }) : 0,
      companyId ? this.prisma.jobApplication.count({ where: { job: { companyId } } }) : 0,
      this.prisma.interviewSchedule.count({
        where: { recruiterId: profile.id, status: 'scheduled', scheduledAt: { gte: new Date() } },
      }),
      this.prisma.shortlist.findMany({
        where: { recruiterId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { candidate: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
    ]);

    return {
      totalJobs,
      totalApplications,
      upcomingInterviews,
      recentShortlists,
    };
  }

  // ---------- Candidates Search ----------

  async searchCandidates(query: { q?: string; skills?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Record<string, unknown> = { role: { name: 'student' } };
    if (query.q) {
      where.fullName = { contains: query.q, mode: 'insensitive' };
    }
    if (query.skills) {
      where.skillProfiles = { some: { name: { contains: query.skills, mode: 'insensitive' } } };
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          createdAt: true,
          skillProfiles: { select: { name: true, proficiencyLevel: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ---------- Shortlist ----------

  async shortlistCandidate(recruiterUserId: string, candidateId: string, dto: CreateShortlistDto) {
    const profile = await this.getProfile(recruiterUserId);
    const candidate = await this.prisma.user.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' });
    }
    const existing = await this.prisma.shortlist.findFirst({
      where: {
        recruiterId: profile.id,
        candidateId,
        jobId: dto.jobId ?? null,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_SHORTLISTED',
        message: 'Candidate already shortlisted',
      });
    }
    return this.prisma.shortlist.create({
      data: { recruiterId: profile.id, candidateId, ...dto },
      include: {
        candidate: { select: { id: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });
  }

  async listShortlists(recruiterUserId: string) {
    const profile = await this.getProfile(recruiterUserId);
    return this.prisma.shortlist.findMany({
      where: { recruiterId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { id: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });
  }

  async updateShortlistStatus(id: string, recruiterUserId: string, dto: UpdateShortlistStatusDto) {
    const profile = await this.getProfile(recruiterUserId);
    const shortlist = await this.prisma.shortlist.findUnique({ where: { id } });
    if (!shortlist) {
      throw new NotFoundException({ code: 'SHORTLIST_NOT_FOUND', message: 'Shortlist not found' });
    }
    if (shortlist.recruiterId !== profile.id) {
      throw new ForbiddenException({ code: 'NOT_RECRUITER', message: 'Not your shortlist' });
    }
    return this.prisma.shortlist.update({ where: { id }, data: { status: dto.status } });
  }

  // ---------- Interview Schedules ----------

  async createInterview(recruiterUserId: string, dto: CreateInterviewScheduleDto) {
    const profile = await this.getProfile(recruiterUserId);
    return this.prisma.interviewSchedule.create({
      data: { recruiterId: profile.id, ...dto },
      include: {
        candidate: { select: { id: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });
  }

  async listInterviews(recruiterUserId: string, status?: string) {
    const profile = await this.getProfile(recruiterUserId);
    return this.prisma.interviewSchedule.findMany({
      where: { recruiterId: profile.id, ...(status ? { status } : {}) },
      orderBy: { scheduledAt: 'asc' },
      include: {
        candidate: { select: { id: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });
  }

  async updateInterview(id: string, recruiterUserId: string, dto: UpdateInterviewScheduleDto) {
    const profile = await this.getProfile(recruiterUserId);
    const interview = await this.prisma.interviewSchedule.findUnique({ where: { id } });
    if (!interview) {
      throw new NotFoundException({ code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found' });
    }
    if (interview.recruiterId !== profile.id) {
      throw new ForbiddenException({ code: 'NOT_RECRUITER', message: 'Not your interview' });
    }
    return this.prisma.interviewSchedule.update({ where: { id }, data: dto });
  }

  async deleteInterview(id: string, recruiterUserId: string) {
    const profile = await this.getProfile(recruiterUserId);
    const interview = await this.prisma.interviewSchedule.findUnique({ where: { id } });
    if (!interview) {
      throw new NotFoundException({ code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found' });
    }
    if (interview.recruiterId !== profile.id) {
      throw new ForbiddenException({ code: 'NOT_RECRUITER', message: 'Not your interview' });
    }
    await this.prisma.interviewSchedule.delete({ where: { id } });
  }

  // ---------- Analytics ----------

  async getAnalytics(recruiterUserId: string) {
    const profile = await this.getProfile(recruiterUserId);

    const [totalShortlisted, totalInterviewed, totalOffered, interviewStats] = await Promise.all([
      this.prisma.shortlist.count({ where: { recruiterId: profile.id } }),
      this.prisma.shortlist.count({ where: { recruiterId: profile.id, status: 'interviewed' } }),
      this.prisma.shortlist.count({ where: { recruiterId: profile.id, status: 'offered' } }),
      this.prisma.interviewSchedule.aggregate({
        where: { recruiterId: profile.id, status: 'completed', rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      totalShortlisted,
      totalInterviewed,
      totalOffered,
      averageRating: interviewStats._avg.rating,
      totalReviews: interviewStats._count.rating,
    };
  }
}
