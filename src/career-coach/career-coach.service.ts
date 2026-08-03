import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ZodType } from 'zod';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import {
  chatResponseSchema,
  salaryPredictionSchema,
  buildChatPrompt,
  buildSalaryPredictionPrompt,
  CareerCoachContext,
} from './career-coach-ai';
import { CareerCoachRepository } from './career-coach.repository';
import { generateCareerRoadmap } from './career-roadmap';
import { generateLearningRecommendations } from './learning-recommendations';
import { computeSkillGap } from './skill-gap';

const CAREER_GOAL_REQUIRED = {
  code: 'CAREER_GOAL_REQUIRED',
  message:
    'Set an active career goal (target role / companies / industries) in your profile first.',
};
const EMPTY_CHAT = { code: 'EMPTY_CHAT', message: 'Message cannot be empty' };

@Injectable()
export class CareerCoachService {
  constructor(
    private readonly repository: CareerCoachRepository,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  // ---- Roadmap ----

  async getRoadmap(userId: string) {
    const goal = await this.requireActiveGoal(userId);
    const roadmap = generateCareerRoadmap({
      targetRole: goal.targetRole,
      targetDate: goal.targetDate,
      targetCtcLakhs: goal.targetCtcLakhs,
      targetCompanies: goal.targetCompanies,
      industries: goal.industries,
      currentSkills: (await this.repository.findSkillProfile(userId)).map((skill) => skill.name),
    });
    await this.repository.replaceRoadmap(userId, goal.id, roadmap.phases);
    return {
      totalMonths: roadmap.totalMonths,
      phases: roadmap.phases,
    };
  }

  // ---- Learning recommendations ----

  async getRecommendations(userId: string) {
    const goal = await this.requireActiveGoal(userId);
    const skillNames = (await this.repository.findSkillProfile(userId)).map((skill) => skill.name);
    const gap = computeSkillGap({
      currentSkills: skillNames,
      targetRole: goal.targetRole,
      targetCompanies: goal.targetCompanies,
      industries: goal.industries,
    });
    const recommendations = generateLearningRecommendations({
      missingSkills: gap.missing,
    });
    await this.repository.replaceRecommendations(userId, recommendations);
    return {
      targetRole: gap.targetRole,
      gap: {
        present: gap.present,
        missing: gap.missing,
        targetCount: gap.targetCount,
        coverage: gap.coverage,
      },
      recommendations,
    };
  }

  // ---- Salary prediction ----

  async getSalaryPrediction(userId: string) {
    const goal = await this.requireActiveGoal(userId);
    const context = await this.buildContext(userId, goal);
    const { system, prompt } = buildSalaryPredictionPrompt(context);
    const result = await this.callAi({
      system,
      prompt,
      schema: salaryPredictionSchema,
    });
    const prediction = await this.repository.upsertSalaryPrediction({
      userId,
      targetRole: goal.targetRole ?? 'software engineer',
      targetCompany: goal.targetCompanies[0] ?? null,
      baseLakhs: result.baseCtcLakhs,
      totalCtcLakhs: result.totalCtcLakhs,
      rangeLowLakhs: result.rangeLowLakhs,
      rangeHighLakhs: result.rangeHighLakhs,
      confidence: result.confidence,
      isEstimate: true,
      factors: result.factors ?? [],
    });
    await this.audit.record({
      userId,
      action: 'career-coach.salary.predicted',
      entityType: 'salary_prediction',
      entityId: prediction.id,
      after: { totalCtcLakhs: prediction.totalCtcLakhs, confidence: prediction.confidence },
    });
    return {
      targetRole: prediction.targetRole,
      targetCompany: prediction.targetCompany,
      currency: prediction.currency,
      baseCtcLakhs: prediction.baseLakhs,
      totalCtcLakhs: prediction.totalCtcLakhs,
      rangeLowLakhs: prediction.rangeLowLakhs,
      rangeHighLakhs: prediction.rangeHighLakhs,
      confidence: prediction.confidence,
      isEstimate: prediction.isEstimate,
      factors: prediction.factors,
      generatedAt: prediction.generatedAt.toISOString(),
    };
  }

  // ---- Skill gap ----

  async getSkillGap(userId: string) {
    const goal = await this.requireActiveGoal(userId);
    const skillNames = (await this.repository.findSkillProfile(userId)).map((skill) => skill.name);
    const gap = computeSkillGap({
      currentSkills: skillNames,
      targetRole: goal.targetRole,
      targetCompanies: goal.targetCompanies,
      industries: goal.industries,
    });
    const persisted = await this.repository.upsertSkillGap({
      userId,
      targetRole: gap.targetRole,
      missing: gap.missing,
      present: gap.present,
      coverage: gap.coverage,
    });
    return {
      targetRole: persisted.targetRole,
      present: persisted.present,
      missing: persisted.missing,
      targetCount: gap.targetCount,
      coverage: gap.coverage,
      assessedAt: persisted.assessedAt.toISOString(),
    };
  }

  // ---- Chat ----

  async sendChatMessage(userId: string, message: string, ip?: string) {
    const trimmed = message?.trim?.();
    if (!trimmed) {
      throw new BadRequestException(EMPTY_CHAT);
    }
    const goal = await this.repository.findActiveCareerGoal(userId);
    const context = await this.buildContext(userId, goal);
    const history = (await this.repository.listChatMessages(userId, 1, 20))
      .reverse()
      .map((item) => `${item.role}: ${item.content}`);

    const { system, prompt } = buildChatPrompt(context, history, trimmed);
    const response = await this.callAi({
      system,
      prompt,
      schema: chatResponseSchema,
    });

    const userMessage = await this.repository.createChatMessage(userId, 'user', trimmed);
    const assistantMessage = await this.repository.createChatMessage(
      userId,
      'assistant',
      response.reply,
    );
    await this.audit.record({
      userId,
      action: 'career-coach.chat.sent',
      entityType: 'career_chat_message',
      entityId: userMessage.id,
      after: { assistantMessageId: assistantMessage.id },
      ip,
    });

    return { reply: response.reply };
  }

  async listChat(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repository.listChatMessages(userId, page, limit),
      this.repository.countChatMessages(userId),
    ]);
    return {
      data: data
        .map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt.toISOString(),
        }))
        .reverse(),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ---- Internals ----

  private async requireActiveGoal(userId: string) {
    const goal = await this.repository.findActiveCareerGoal(userId);
    if (!goal) {
      throw new NotFoundException(CAREER_GOAL_REQUIRED);
    }
    return goal;
  }

  private async buildContext(
    userId: string,
    careerGoal: {
      targetRole?: string | null;
      targetCompanies: string[];
      industries: string[];
      targetCtcLakhs?: number | null;
      targetDate?: Date | null;
    } | null,
  ): Promise<CareerCoachContext> {
    return {
      skills: await this.repository.findSkillProfile(userId),
      careerGoal: careerGoal
        ? {
            targetRole: careerGoal.targetRole,
            targetCompanies: careerGoal.targetCompanies,
            industries: careerGoal.industries,
            targetCtcLakhs: careerGoal.targetCtcLakhs,
            targetDate: careerGoal.targetDate,
          }
        : undefined,
    };
  }

  /**
   * Run a structured AI call and normalize failures into a clean, retryable
   * 502 `AI_GENERATION_FAILED` instead of leaking the raw error. Callers must
   * only persist state after this resolves, so a failed AI call persists
   * nothing.
   */
  private async callAi<T>(request: {
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
}
