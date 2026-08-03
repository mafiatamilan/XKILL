import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeContent } from './ats-scorer';

export interface CreateResumeInput {
  userId: string;
  title: string;
  templateId: string;
  content: ResumeContent;
}

export interface UpdateResumeInput {
  title?: string;
  templateId?: string;
  content?: ResumeContent;
}

export interface VersionSnapshot {
  title: string;
  templateId: string;
  content: ResumeContent;
}

const resumeInclude = {
  template: { select: { id: true, slug: true, name: true, style: true } },
  _count: { select: { versions: true, analyses: true } },
} satisfies Prisma.ResumeInclude;

@Injectable()
export class ResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.resumeTemplate.findMany({
      where: { isActive: true },
      orderBy: { slug: 'asc' },
    });
  }

  findTemplateById(id: string) {
    return this.prisma.resumeTemplate.findUnique({ where: { id } });
  }

  createResume(data: CreateResumeInput) {
    return this.prisma.resume.create({
      data: {
        userId: data.userId,
        title: data.title,
        templateId: data.templateId,
        content: data.content as unknown as Prisma.InputJsonValue,
      },
    });
  }

  findResumeById(id: string) {
    return this.prisma.resume.findUnique({
      where: { id },
      include: resumeInclude,
    });
  }

  findOwnedResume(id: string, userId: string) {
    return this.prisma.resume.findFirst({
      where: { id, userId },
      include: resumeInclude,
    });
  }

  updateResume(id: string, data: UpdateResumeInput) {
    return this.prisma.resume.update({
      where: { id },
      data: {
        title: data.title,
        templateId: data.templateId,
        content: data.content as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  }

  deleteResume(id: string) {
    return this.prisma.resume.delete({ where: { id } });
  }

  countResumes(userId: string): Promise<number> {
    return this.prisma.resume.count({ where: { userId } });
  }

  listResumes(userId: string, page: number, limit: number) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: { select: { id: true, slug: true, name: true } },
        _count: { select: { versions: true } },
      },
    });
  }

  async createWithVersion(
    data: CreateResumeInput,
    snapshot: VersionSnapshot,
  ): Promise<{ resume: unknown; versionId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const resume = await tx.resume.create({
        data: {
          userId: data.userId,
          title: data.title,
          templateId: data.templateId,
          content: data.content as unknown as Prisma.InputJsonValue,
        },
      });
      const version = await tx.resumeVersion.create({
        data: {
          resumeId: resume.id,
          version: 1,
          title: snapshot.title,
          templateId: snapshot.templateId,
          content: snapshot.content as unknown as Prisma.InputJsonValue,
        },
      });
      return { resume, versionId: version.id };
    });
  }

  async updateResumeWithVersion(
    id: string,
    data: UpdateResumeInput,
    snapshot: VersionSnapshot,
    nextVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const resume = await tx.resume.update({
        where: { id },
        data: {
          title: data.title,
          templateId: data.templateId,
          content: data.content as unknown as Prisma.InputJsonValue | undefined,
        },
      });
      const version = await tx.resumeVersion.create({
        data: {
          resumeId: id,
          version: nextVersion,
          title: snapshot.title,
          templateId: snapshot.templateId,
          content: snapshot.content as unknown as Prisma.InputJsonValue,
        },
      });
      return { resume, versionId: version.id };
    });
  }

  async restoreVersion(resumeId: string, snapshot: VersionSnapshot, nextVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      const resume = await tx.resume.update({
        where: { id: resumeId },
        data: {
          title: snapshot.title,
          templateId: snapshot.templateId,
          content: snapshot.content as unknown as Prisma.InputJsonValue,
        },
      });
      const version = await tx.resumeVersion.create({
        data: {
          resumeId,
          version: nextVersion,
          title: snapshot.title,
          templateId: snapshot.templateId,
          content: snapshot.content as unknown as Prisma.InputJsonValue,
        },
      });
      return { resume, versionId: version.id };
    });
  }

  countVersions(resumeId: string): Promise<number> {
    return this.prisma.resumeVersion.count({ where: { resumeId } });
  }

  listVersions(resumeId: string, page: number, limit: number) {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { version: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findVersionById(resumeId: string, versionId: string) {
    return this.prisma.resumeVersion.findFirst({
      where: { resumeId, id: versionId },
    });
  }

  upsertAtsAnalysis(data: {
    resumeId: string;
    score: number;
    sectionScores: unknown;
    missingSections: string[];
    atsIssues: unknown;
    textDensity: string;
    keywordOverlap: unknown;
    suggestions: unknown;
    suggestionsStatus: string;
  }) {
    return this.prisma.atsAnalysis.upsert({
      where: { resumeId: data.resumeId },
      update: {
        score: data.score,
        sectionScores: data.sectionScores as Prisma.InputJsonValue,
        missingSections: data.missingSections,
        atsIssues: data.atsIssues as Prisma.InputJsonValue,
        textDensity: data.textDensity,
        keywordOverlap: data.keywordOverlap as Prisma.InputJsonValue | undefined,
        suggestions: data.suggestions as Prisma.InputJsonValue | undefined,
        suggestionsStatus: data.suggestionsStatus,
      },
      create: {
        resumeId: data.resumeId,
        score: data.score,
        sectionScores: data.sectionScores as Prisma.InputJsonValue,
        missingSections: data.missingSections,
        atsIssues: data.atsIssues as Prisma.InputJsonValue,
        textDensity: data.textDensity,
        keywordOverlap: data.keywordOverlap as Prisma.InputJsonValue | undefined,
        suggestions: data.suggestions as Prisma.InputJsonValue | undefined,
        suggestionsStatus: data.suggestionsStatus,
      },
    });
  }

  findAtsAnalysis(resumeId: string) {
    return this.prisma.atsAnalysis.findUnique({ where: { resumeId } });
  }
}
