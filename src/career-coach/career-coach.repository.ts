import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SkillProfileRow {
  name: string;
  category: string;
  proficiencyLevel: string;
  yearsOfExperience: number | null;
  isPrimary: boolean;
}

export interface ActiveCareerGoal {
  id: string;
  targetRole: string | null;
  targetCompanies: string[];
  industries: string[];
  targetCtcLakhs: number | null;
  targetDate: Date | null;
}

export interface RoadmapItemInput {
  phase: number;
  title: string;
  duration: string;
  summary: string;
  focus: string[];
  milestones: string[];
}

export interface RecommendationInput {
  skill: string;
  title: string;
  resourceType: string;
  provider: string;
  url?: string;
  priority: number;
  reason: string;
}

@Injectable()
export class CareerCoachRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCareerGoal(userId: string): Promise<ActiveCareerGoal | null> {
    return this.prisma.careerGoal.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        targetRole: true,
        targetCompanies: true,
        industries: true,
        targetCtcLakhs: true,
        targetDate: true,
      },
    });
  }

  findSkillProfile(userId: string, limit = 20): Promise<SkillProfileRow[]> {
    return this.prisma.skillProfile.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { proficiencyLevel: 'asc' }],
      take: limit,
      select: {
        name: true,
        category: true,
        proficiencyLevel: true,
        yearsOfExperience: true,
        isPrimary: true,
      },
    });
  }

  async replaceRoadmap(
    userId: string,
    careerGoalId: string | null,
    items: RoadmapItemInput[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.careerRoadmapItem.deleteMany({ where: { userId } }),
      this.prisma.careerRoadmapItem.createMany({
        data: items.map((item) => ({
          userId,
          careerGoalId,
          phase: item.phase,
          title: item.title,
          duration: item.duration,
          summary: item.summary,
          focus: item.focus,
          milestones: item.milestones,
        })),
      }),
    ]);
  }

  listRoadmap(userId: string) {
    return this.prisma.careerRoadmapItem.findMany({
      where: { userId },
      orderBy: { phase: 'asc' },
    });
  }

  async replaceRecommendations(userId: string, items: RecommendationInput[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.learningRecommendation.deleteMany({ where: { userId } }),
      this.prisma.learningRecommendation.createMany({
        data: items.map((item) => ({
          userId,
          skill: item.skill,
          title: item.title,
          resourceType: item.resourceType,
          provider: item.provider,
          url: item.url ?? null,
          priority: item.priority,
          reason: item.reason,
        })),
      }),
    ]);
  }

  listRecommendations(userId: string) {
    return this.prisma.learningRecommendation.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });
  }

  upsertSalaryPrediction(data: {
    userId: string;
    targetRole: string;
    targetCompany?: string | null;
    baseLakhs: number;
    totalCtcLakhs: number;
    rangeLowLakhs: number;
    rangeHighLakhs: number;
    confidence: number;
    isEstimate: boolean;
    factors: string[];
  }) {
    return this.prisma.salaryPrediction.upsert({
      where: { userId: data.userId },
      update: {
        targetRole: data.targetRole,
        targetCompany: data.targetCompany ?? null,
        baseLakhs: data.baseLakhs,
        totalCtcLakhs: data.totalCtcLakhs,
        rangeLowLakhs: data.rangeLowLakhs,
        rangeHighLakhs: data.rangeHighLakhs,
        confidence: data.confidence,
        isEstimate: data.isEstimate,
        factors: data.factors,
      },
      create: {
        userId: data.userId,
        targetRole: data.targetRole,
        targetCompany: data.targetCompany ?? null,
        baseLakhs: data.baseLakhs,
        totalCtcLakhs: data.totalCtcLakhs,
        rangeLowLakhs: data.rangeLowLakhs,
        rangeHighLakhs: data.rangeHighLakhs,
        confidence: data.confidence,
        isEstimate: data.isEstimate,
        factors: data.factors,
      },
    });
  }

  findSalaryPrediction(userId: string) {
    return this.prisma.salaryPrediction.findUnique({ where: { userId } });
  }

  upsertSkillGap(data: {
    userId: string;
    targetRole: string;
    missing: string[];
    present: string[];
    coverage: number;
  }) {
    return this.prisma.skillGap.upsert({
      where: { userId: data.userId },
      update: {
        targetRole: data.targetRole,
        missing: data.missing,
        present: data.present,
        coverage: data.coverage,
      },
      create: {
        userId: data.userId,
        targetRole: data.targetRole,
        missing: data.missing,
        present: data.present,
        coverage: data.coverage,
      },
    });
  }

  findSkillGap(userId: string) {
    return this.prisma.skillGap.findUnique({ where: { userId } });
  }

  createChatMessage(userId: string, role: 'user' | 'assistant', content: string) {
    return this.prisma.careerChatMessage.create({
      data: { userId, role, content },
    });
  }

  countChatMessages(userId: string): Promise<number> {
    return this.prisma.careerChatMessage.count({ where: { userId } });
  }

  listChatMessages(userId: string, page: number, limit: number) {
    return this.prisma.careerChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
