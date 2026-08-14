import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InputJsonValue } from '@prisma/client/runtime/library';
import {
  CreateCompanyPrepPathDto,
  UpdateCompanyPrepPathDto,
  CreateHiringPatternDto,
  UpdateHiringPatternDto,
  CreateInterviewQuestionDto,
  UpdateInterviewQuestionDto,
  CreateOnlineAssessmentDto,
  UpdateOnlineAssessmentDto,
  CreateSalaryInsightDto,
  UpdateSalaryInsightDto,
  CreatePrepTimelineDto,
  UpdatePrepTimelineDto,
} from './dto/company-prep.dto';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CompanyPrepService {
  private readonly logger = new Logger(CompanyPrepService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Company CRUD ----------

  async createCompany(dto: CreateCompanyPrepPathDto) {
    const existing = await this.prisma.companyPrepPath.findUnique({
      where: { companyName: dto.companyName },
    });
    if (existing) {
      throw new ConflictException({
        code: 'COMPANY_EXISTS',
        message: 'Company prep path already exists',
      });
    }
    return this.prisma.companyPrepPath.create({
      data: {
        ...dto,
        slug: slugify(dto.companyName),
      },
    });
  }

  async listCompanies(query: { q?: string; industry?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Record<string, unknown> = {};
    if (query.q) {
      where.companyName = { contains: query.q, mode: 'insensitive' };
    }
    if (query.industry) {
      where.industry = { contains: query.industry, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      this.prisma.companyPrepPath.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { companyName: 'asc' },
      }),
      this.prisma.companyPrepPath.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getCompanyBySlug(slug: string) {
    const company = await this.prisma.companyPrepPath.findUnique({ where: { slug } });
    if (!company) {
      throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    }
    return company;
  }

  async getFullPrepPath(slug: string) {
    const company = await this.prisma.companyPrepPath.findUnique({
      where: { slug },
      include: {
        hiringPatterns: { orderBy: { roundOrder: 'asc' } },
        interviewQuestions: { orderBy: { createdAt: 'desc' } },
        onlineAssessments: { orderBy: { createdAt: 'desc' } },
        salaryInsights: { orderBy: { role: 'asc' } },
        prepTimelines: { orderBy: { weekNumber: 'asc' } },
      },
    });
    if (!company) {
      throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    }
    return company;
  }

  async updateCompany(slug: string, dto: UpdateCompanyPrepPathDto) {
    await this.getCompanyBySlug(slug);
    return this.prisma.companyPrepPath.update({
      where: { slug },
      data: {
        ...dto,
        ...(dto.companyName ? { slug: slugify(dto.companyName) } : {}),
      },
    });
  }

  async deleteCompany(slug: string) {
    await this.getCompanyBySlug(slug);
    await this.prisma.companyPrepPath.delete({ where: { slug } });
  }

  // ---------- Hiring Patterns ----------

  async addHiringPattern(slug: string, dto: CreateHiringPatternDto) {
    const company = await this.getCompanyBySlug(slug);
    const existing = await this.prisma.hiringPattern.findUnique({
      where: { companyId_roundOrder: { companyId: company.id, roundOrder: dto.roundOrder } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ROUND_EXISTS',
        message: 'Hiring pattern round already exists for this order',
      });
    }
    return this.prisma.hiringPattern.create({ data: { ...dto, companyId: company.id } });
  }

  async listHiringPatterns(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.hiringPattern.findMany({
      where: { companyId: company.id },
      orderBy: { roundOrder: 'asc' },
    });
  }

  async updateHiringPattern(id: string, dto: UpdateHiringPatternDto) {
    await this.assertHiringPattern(id);
    return this.prisma.hiringPattern.update({ where: { id }, data: dto });
  }

  async deleteHiringPattern(id: string) {
    await this.assertHiringPattern(id);
    await this.prisma.hiringPattern.delete({ where: { id } });
  }

  // ---------- Interview Questions ----------

  async addInterviewQuestion(slug: string, dto: CreateInterviewQuestionDto) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.interviewQuestion.create({ data: { ...dto, companyId: company.id } });
  }

  async listInterviewQuestions(slug: string, category?: string) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.interviewQuestion.findMany({
      where: { companyId: company.id, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInterviewQuestion(id: string, dto: UpdateInterviewQuestionDto) {
    await this.assertInterviewQuestion(id);
    return this.prisma.interviewQuestion.update({ where: { id }, data: dto });
  }

  async deleteInterviewQuestion(id: string) {
    await this.assertInterviewQuestion(id);
    await this.prisma.interviewQuestion.delete({ where: { id } });
  }

  // ---------- Online Assessments ----------

  async addOnlineAssessment(slug: string, dto: CreateOnlineAssessmentDto) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.onlineAssessment.create({
      data: { ...dto, companyId: company.id, sections: dto.sections as unknown as InputJsonValue },
    });
  }

  async listOnlineAssessments(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.onlineAssessment.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOnlineAssessment(id: string, dto: UpdateOnlineAssessmentDto) {
    await this.assertOnlineAssessment(id);
    return this.prisma.onlineAssessment.update({
      where: { id },
      data: { ...dto, sections: dto.sections as unknown as InputJsonValue },
    });
  }

  async deleteOnlineAssessment(id: string) {
    await this.assertOnlineAssessment(id);
    await this.prisma.onlineAssessment.delete({ where: { id } });
  }

  // ---------- Salary Insights ----------

  async addSalaryInsight(slug: string, dto: CreateSalaryInsightDto) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.salaryInsight.create({ data: { ...dto, companyId: company.id } });
  }

  async listSalaryInsights(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.salaryInsight.findMany({
      where: { companyId: company.id },
      orderBy: { role: 'asc' },
    });
  }

  async updateSalaryInsight(id: string, dto: UpdateSalaryInsightDto) {
    await this.assertSalaryInsight(id);
    return this.prisma.salaryInsight.update({ where: { id }, data: dto });
  }

  async deleteSalaryInsight(id: string) {
    await this.assertSalaryInsight(id);
    await this.prisma.salaryInsight.delete({ where: { id } });
  }

  // ---------- Prep Timelines ----------

  async addPrepTimeline(slug: string, dto: CreatePrepTimelineDto) {
    const company = await this.getCompanyBySlug(slug);
    const existing = await this.prisma.prepTimeline.findUnique({
      where: { companyId_weekNumber: { companyId: company.id, weekNumber: dto.weekNumber } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'WEEK_EXISTS',
        message: 'Prep timeline week already exists',
      });
    }
    return this.prisma.prepTimeline.create({ data: { ...dto, companyId: company.id } });
  }

  async listPrepTimelines(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return this.prisma.prepTimeline.findMany({
      where: { companyId: company.id },
      orderBy: { weekNumber: 'asc' },
    });
  }

  async updatePrepTimeline(id: string, dto: UpdatePrepTimelineDto) {
    await this.assertPrepTimeline(id);
    return this.prisma.prepTimeline.update({ where: { id }, data: dto });
  }

  async deletePrepTimeline(id: string) {
    await this.assertPrepTimeline(id);
    await this.prisma.prepTimeline.delete({ where: { id } });
  }

  // ---------- Assertions ----------

  private async assertHiringPattern(id: string) {
    const h = await this.prisma.hiringPattern.findUnique({ where: { id } });
    if (!h)
      throw new NotFoundException({
        code: 'PATTERN_NOT_FOUND',
        message: 'Hiring pattern not found',
      });
    return h;
  }

  private async assertInterviewQuestion(id: string) {
    const q = await this.prisma.interviewQuestion.findUnique({ where: { id } });
    if (!q)
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Interview question not found',
      });
    return q;
  }

  private async assertOnlineAssessment(id: string) {
    const a = await this.prisma.onlineAssessment.findUnique({ where: { id } });
    if (!a)
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: 'Online assessment not found',
      });
    return a;
  }

  private async assertSalaryInsight(id: string) {
    const s = await this.prisma.salaryInsight.findUnique({ where: { id } });
    if (!s)
      throw new NotFoundException({
        code: 'SALARY_NOT_FOUND',
        message: 'Salary insight not found',
      });
    return s;
  }

  private async assertPrepTimeline(id: string) {
    const t = await this.prisma.prepTimeline.findUnique({ where: { id } });
    if (!t)
      throw new NotFoundException({
        code: 'TIMELINE_NOT_FOUND',
        message: 'Prep timeline not found',
      });
    return t;
  }
}
