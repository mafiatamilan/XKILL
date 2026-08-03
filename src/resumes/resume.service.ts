import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ZodType } from 'zod';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import { computeAtsScore, ResumeContent } from './ats-scorer';
import { buildAtsSuggestionsPrompt, atsSuggestionsResponseSchema } from './resume-ai';
import { ResumeRepository, VersionSnapshot } from './resume.repository';
import { renderResumePdf } from './pdf-exporter';
import { renderResumeDocx } from './docx-exporter';

const RESUME_NOT_FOUND = {
  code: 'RESUME_NOT_FOUND',
  message: 'Resume not found',
};
const TEMPLATE_NOT_FOUND = {
  code: 'TEMPLATE_NOT_FOUND',
  message: 'Resume template not found',
};
const VERSION_NOT_FOUND = {
  code: 'VERSION_NOT_FOUND',
  message: 'Resume version not found',
};
const EXPORT_FORMAT_REQUIRED = {
  code: 'EXPORT_FORMAT_REQUIRED',
  message: 'An export format is required: `pdf` or `docx`',
};
const EXPORT_FORMAT_UNSUPPORTED = {
  code: 'EXPORT_FORMAT_UNSUPPORTED',
  message: 'Unsupported export format. Supported: `pdf`, `docx`',
};

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

@Injectable()
export class ResumeService {
  constructor(
    private readonly repository: ResumeRepository,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  // ---- Templates ----

  async listTemplates() {
    const templates = await this.repository.listTemplates();
    return {
      data: templates.map((template) => ({
        id: template.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
      })),
      meta: buildPaginationMeta(templates.length, 1, templates.length || 1),
    };
  }

  // ---- CRUD ----

  async createResume(
    userId: string,
    dto: { title: string; templateId: string; content: ResumeContent },
    ip?: string,
  ) {
    const template = await this.repository.findTemplateById(dto.templateId);
    if (!template) {
      throw new NotFoundException(TEMPLATE_NOT_FOUND);
    }
    const snapshot: VersionSnapshot = {
      title: dto.title,
      templateId: dto.templateId,
      content: dto.content,
    };
    const { resume, versionId } = await this.repository.createWithVersion(
      {
        userId,
        title: dto.title,
        templateId: dto.templateId,
        content: dto.content,
      },
      snapshot,
    );
    await this.audit.record({
      userId,
      action: 'resume.created',
      entityType: 'resume',
      entityId: (resume as { id: string }).id,
      after: { title: dto.title, templateId: dto.templateId },
      ip,
    });
    return this.mapResume(resume as Record<string, unknown> as never, versionId);
  }

  async listResumes(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repository.listResumes(userId, page, limit),
      this.repository.countResumes(userId),
    ]);
    return {
      data: data.map((resume) => ({
        id: resume.id,
        title: resume.title,
        template: resume.template
          ? { id: resume.template.id, slug: resume.template.slug, name: resume.template.name }
          : null,
        versionCount: resume._count.versions,
        updatedAt: resume.updatedAt.toISOString(),
        createdAt: resume.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getResume(userId: string, id: string) {
    const resume = await this.repository.findOwnedResume(id, userId);
    if (!resume) {
      throw new NotFoundException(RESUME_NOT_FOUND);
    }
    return this.mapDetail(resume);
  }

  async updateResume(
    userId: string,
    id: string,
    dto: { title?: string; templateId?: string; content?: ResumeContent },
    ip?: string,
  ) {
    const resume = await this.repository.findOwnedResume(id, userId);
    if (!resume) {
      throw new NotFoundException(RESUME_NOT_FOUND);
    }
    if (dto.templateId && dto.templateId !== resume.templateId) {
      const template = await this.repository.findTemplateById(dto.templateId);
      if (!template) {
        throw new NotFoundException(TEMPLATE_NOT_FOUND);
      }
    }

    const currentContent = resume.content as unknown as ResumeContent;
    const nextTitle = dto.title ?? resume.title;
    const nextTemplateId = dto.templateId ?? resume.templateId;
    const nextContent = dto.content ?? currentContent;
    const contentChanged = JSON.stringify(nextContent) !== JSON.stringify(currentContent);

    const nextVersion = (await this.repository.countVersions(id)) + 1;
    const { resume: updated, versionId } = await this.repository.updateResumeWithVersion(
      id,
      { title: nextTitle, templateId: nextTemplateId, content: nextContent },
      { title: nextTitle, templateId: nextTemplateId, content: nextContent },
      nextVersion,
    );
    await this.audit.record({
      userId,
      action: 'resume.updated',
      entityType: 'resume',
      entityId: id,
      before: { title: resume.title, contentChanged },
      after: { title: nextTitle, templateId: nextTemplateId },
      ip,
    });
    return this.mapResume(updated as Record<string, unknown> as never, versionId);
  }

  async deleteResume(userId: string, id: string, ip?: string) {
    const resume = await this.repository.findOwnedResume(id, userId);
    if (!resume) {
      throw new NotFoundException(RESUME_NOT_FOUND);
    }
    await this.repository.deleteResume(id);
    await this.audit.record({
      userId,
      action: 'resume.deleted',
      entityType: 'resume',
      entityId: id,
      after: { title: resume.title },
      ip,
    });
    return { id, deleted: true };
  }

  // ---- ATS ----

  async runAtsAnalysis(userId: string, id: string, dto: { jobDescription?: string }, ip?: string) {
    const resume = await this.requireOwned(userId, id);
    const content = resume.content as unknown as ResumeContent;
    const result = computeAtsScore(content, dto.jobDescription);

    let suggestions: unknown = null;
    let suggestionsStatus = 'none';
    try {
      const { system, prompt } = buildAtsSuggestionsPrompt({
        content,
        score: result,
        jobDescription: dto.jobDescription,
      });
      const response = await this.callAiSuggestions({
        system,
        prompt,
        schema: atsSuggestionsResponseSchema,
      });
      suggestions = response.suggestions;
      suggestionsStatus = 'ready';
    } catch {
      suggestionsStatus = 'failed';
      suggestions = null;
      await this.repository.upsertAtsAnalysis({
        resumeId: id,
        score: result.score,
        sectionScores: result.sectionScores,
        missingSections: result.missingSections,
        atsIssues: result.issues,
        textDensity: result.textDensity,
        keywordOverlap: result.keywordOverlap,
        suggestions: null,
        suggestionsStatus,
      });
      await this.audit.record({
        userId,
        action: 'resume.ats.analysis',
        entityType: 'ats_analysis',
        entityId: id,
        after: { score: result.score, suggestionsStatus },
        ip,
      });
      throw new ServiceUnavailableException({
        code: 'AI_SUGGESTIONS_FAILED',
        message: 'ATS score computed but AI suggestions are unavailable; please retry.',
      });
    }

    const analysis = await this.repository.upsertAtsAnalysis({
      resumeId: id,
      score: result.score,
      sectionScores: result.sectionScores,
      missingSections: result.missingSections,
      atsIssues: result.issues,
      textDensity: result.textDensity,
      keywordOverlap: result.keywordOverlap,
      suggestions,
      suggestionsStatus,
    });
    await this.audit.record({
      userId,
      action: 'resume.ats.analysis',
      entityType: 'ats_analysis',
      entityId: id,
      after: { score: result.score, suggestionsStatus },
      ip,
    });
    return this.mapAnalysis(analysis);
  }

  async getScore(userId: string, id: string) {
    const resume = await this.requireOwned(userId, id);
    const analysis = await this.repository.findAtsAnalysis(resume.id);
    if (!analysis) {
      throw new NotFoundException({
        code: 'ATS_ANALYSIS_NOT_FOUND',
        message: 'Run `POST /resumes/:id/ats-analysis` first',
      });
    }
    return {
      score: analysis.score,
      sectionScores: analysis.sectionScores,
      missingSections: analysis.missingSections,
      atsIssues: analysis.atsIssues,
      textDensity: analysis.textDensity,
      keywordOverlap: analysis.keywordOverlap,
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }

  async getSuggestions(userId: string, id: string) {
    const resume = await this.requireOwned(userId, id);
    const analysis = await this.repository.findAtsAnalysis(resume.id);
    if (!analysis) {
      throw new NotFoundException({
        code: 'ATS_ANALYSIS_NOT_FOUND',
        message: 'Run `POST /resumes/:id/ats-analysis` first',
      });
    }
    return {
      suggestions: analysis.suggestions ?? [],
      status: analysis.suggestionsStatus,
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }

  // ---- Export ----

  async exportResume(
    userId: string,
    id: string,
    format: string | undefined,
    versionId?: string,
  ): Promise<ExportResult> {
    if (!format) {
      throw new BadRequestException(EXPORT_FORMAT_REQUIRED);
    }
    if (format !== 'pdf' && format !== 'docx') {
      throw new BadRequestException(EXPORT_FORMAT_UNSUPPORTED);
    }
    const resume = await this.requireOwned(userId, id);

    let templateId: string;
    let content: ResumeContent;
    if (versionId) {
      const version = await this.repository.findVersionById(resume.id, versionId);
      if (!version) {
        throw new NotFoundException(VERSION_NOT_FOUND);
      }
      templateId = version.templateId;
      content = version.content as unknown as ResumeContent;
    } else {
      templateId = resume.templateId;
      content = resume.content as unknown as ResumeContent;
    }

    const template = await this.repository.findTemplateById(templateId);
    const style = template?.style;

    if (format === 'pdf') {
      const buffer = await renderResumePdf(content, style);
      return { buffer, contentType: 'application/pdf', extension: 'pdf' };
    }
    const buffer = await renderResumeDocx(content, style);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };
  }

  // ---- Versions ----

  async listVersions(userId: string, id: string, page: number, limit: number) {
    const resume = await this.requireOwned(userId, id);
    const [data, total] = await Promise.all([
      this.repository.listVersions(resume.id, page, limit),
      this.repository.countVersions(resume.id),
    ]);
    return {
      data: data.map((version) => ({
        id: version.id,
        version: version.version,
        title: version.title,
        createdAt: version.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async restoreVersion(userId: string, id: string, versionId: string, ip?: string) {
    const resume = await this.requireOwned(userId, id);
    const version = await this.repository.findVersionById(resume.id, versionId);
    if (!version) {
      throw new NotFoundException(VERSION_NOT_FOUND);
    }
    const nextVersion = (await this.repository.countVersions(resume.id)) + 1;
    const snapshot: VersionSnapshot = {
      title: version.title,
      templateId: version.templateId,
      content: version.content as unknown as ResumeContent,
    };
    const { resume: restored, versionId: newVersionId } = await this.repository.restoreVersion(
      resume.id,
      snapshot,
      nextVersion,
    );
    await this.audit.record({
      userId,
      action: 'resume.version.restored',
      entityType: 'resume_version',
      entityId: newVersionId,
      before: { fromVersion: version.version, toVersion: nextVersion },
      after: { title: version.title },
      ip,
    });
    return this.mapResume(restored as Record<string, unknown> as never, newVersionId);
  }

  // ---- Internals ----

  private async requireOwned(userId: string, id: string) {
    const resume = await this.repository.findOwnedResume(id, userId);
    if (!resume) {
      throw new NotFoundException(RESUME_NOT_FOUND);
    }
    return resume;
  }

  private async callAiSuggestions<T>(request: {
    system: string;
    prompt: string;
    schema: ZodType<T>;
  }): Promise<T> {
    try {
      return await this.ai.generateStructured(request);
    } catch (err) {
      if (err instanceof AiServiceError) {
        throw new BadGatewayException({
          code: 'AI_GENERATION_FAILED',
          message: err.message,
        });
      }
      throw err;
    }
  }

  private mapResume(
    resume: {
      id: string;
      title: string;
      templateId: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    versionId?: string,
  ) {
    return {
      id: resume.id,
      title: resume.title,
      templateId: resume.templateId,
      versionId,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  private mapDetail(resume: {
    id: string;
    title: string;
    templateId: string;
    content: unknown;
    createdAt: Date;
    updatedAt: Date;
    template?: { id: string; slug: string; name: string; style: unknown } | null;
    _count?: { versions: number; analyses: number };
  }) {
    return {
      id: resume.id,
      title: resume.title,
      template: resume.template
        ? { id: resume.template.id, slug: resume.template.slug, name: resume.template.name }
        : null,
      content: resume.content,
      versionCount: resume._count?.versions ?? 0,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  private mapAnalysis(analysis: {
    score: number;
    sectionScores: unknown;
    missingSections: string[];
    atsIssues: unknown;
    textDensity: string | null;
    keywordOverlap: unknown;
    suggestions: unknown;
    suggestionsStatus: string;
    updatedAt: Date;
  }) {
    return {
      score: analysis.score,
      sectionScores: analysis.sectionScores,
      missingSections: analysis.missingSections,
      atsIssues: analysis.atsIssues,
      textDensity: analysis.textDensity,
      keywordOverlap: analysis.keywordOverlap,
      suggestions: analysis.suggestions ?? [],
      suggestionsStatus: analysis.suggestionsStatus,
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }
}
