import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AiService, AiServiceError } from '../ai/ai.service';
import { z } from 'zod';
import { generateRoadmap, RoadmapInput } from './roadmap-generator';
import { calculateProgress } from './progress';
import { calculatePlacementPrediction } from './readiness-prediction';
import { PlacementRepository } from './placement.repository';
import { GenerateStudyPlanDto } from './dto/placement.dto';

const STUDY_PLAN_SCHEMA = z.object({
  title: z.string(),
  overview: z.string(),
  weeks: z.array(
    z.object({
      week: z.number(),
      theme: z.string(),
      goals: z.array(z.string()),
      activities: z.array(z.string()),
    }),
  ),
});

@Injectable()
export class PlacementService {
  constructor(
    private readonly repository: PlacementRepository,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  // ---- Roadmap ----

  async getRoadmap(userId: string, ip?: string): Promise<unknown> {
    let weeks = await this.repository.findRoadmapWeeks(userId);
    if (weeks.length === 0) {
      const input = await this.collectRoadmapInput(userId);
      weeks = await this.repository.createRoadmap(userId, generateRoadmap(input));
      await this.audit.record({
        userId,
        action: 'placement.roadmap.generated',
        entityType: 'roadmap_week',
        entityId: undefined,
        before: undefined,
        after: { weekCount: weeks.length },
        ip,
      });
    }

    const progress = calculateProgress(
      weeks.map((week) => ({
        weekNumber: week.weekNumber,
        total: week.tasks.length,
        completed: week.tasks.filter((task) => task.isCompleted).length,
      })),
    );

    return {
      weeks: weeks.map((week) => ({
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        focus: week.focus,
        tasks: week.tasks.map((task) => ({
          id: task.id,
          day: task.day,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          reference: task.reference,
          isCompleted: task.isCompleted,
          completedAt: task.completedAt?.toISOString(),
        })),
      })),
      overallPercent: progress.overallPercent,
    };
  }

  async getWeekTasks(userId: string, weekNumber: number): Promise<unknown> {
    const week = await this.repository.findRoadmapWeek(userId, weekNumber);
    if (!week) {
      throw new NotFoundException({
        code: 'ROADMAP_WEEK_NOT_FOUND',
        message: `Roadmap week ${weekNumber} not found`,
      });
    }
    return {
      weekNumber: week.weekNumber,
      title: week.title,
      focus: week.focus,
      tasks: week.tasks.map((task) => ({
        id: task.id,
        day: task.day,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        reference: task.reference,
        isCompleted: task.isCompleted,
        completedAt: task.completedAt?.toISOString(),
      })),
    };
  }

  async completeTask(userId: string, taskId: string, ip?: string): Promise<unknown> {
    const task = await this.repository.findTaskById(taskId, userId);
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }

    const now = new Date();
    const result = await this.repository.completeTask(taskId, userId, now);

    await this.audit.record({
      userId,
      action: 'placement.task.completed',
      entityType: 'daily_task',
      entityId: taskId,
      before: { isCompleted: task.isCompleted },
      after: { isCompleted: true, completedAt: now.toISOString() },
      ip,
    });

    return {
      id: task.id,
      day: task.day,
      title: task.title,
      taskType: task.taskType,
      isCompleted: result.count > 0,
      completedAt: result.count > 0 ? now.toISOString() : task.completedAt?.toISOString(),
    };
  }

  async getProgress(userId: string): Promise<unknown> {
    const weeks = await this.repository.findRoadmapWeeks(userId);
    const progress = calculateProgress(
      weeks.map((week) => ({
        weekNumber: week.weekNumber,
        total: week.tasks.length,
        completed: week.tasks.filter((task) => task.isCompleted).length,
      })),
    );

    await this.repository.upsertProgressRecord(userId, {
      totalTasks: progress.totalTasks,
      completed: progress.completedTasks,
      percent: progress.overallPercent,
      recordedAt: new Date(),
    });

    return progress;
  }

  // ---- Company prep ----

  async getCompanyPrep(company: string): Promise<unknown> {
    const track = await this.repository.findCompanyTrack(company);
    if (!track) {
      throw new NotFoundException({
        code: 'COMPANY_PREP_NOT_FOUND',
        message: `No prep track for company '${company}'`,
      });
    }
    return {
      id: track.id,
      company: track.company,
      description: track.description,
      focusAreas: track.focusAreas,
      resources: track.resources,
    };
  }

  // ---- Readiness prediction ----

  async getReadinessPrediction(userId: string, ip?: string): Promise<unknown> {
    const readiness = await this.repository.findReadinessScore(userId);
    const baseScore = readiness?.overall ?? 0;

    const weeks = await this.repository.findRoadmapWeeks(userId);
    const progress = calculateProgress(
      weeks.map((week) => ({
        weekNumber: week.weekNumber,
        total: week.tasks.length,
        completed: week.tasks.filter((task) => task.isCompleted).length,
      })),
    );

    const goals = await this.repository.listCareerGoals(userId);
    const activeGoal = goals.find((goal) => goal.status === 'active');
    const targetCompanyCount = activeGoal?.targetCompanies?.length ?? 0;

    const prediction = calculatePlacementPrediction({
      readinessScore: baseScore,
      progressPercent: progress.overallPercent,
      targetCompanyCount,
    });

    const now = new Date();
    const persisted = await this.repository.upsertReadinessPrediction(userId, {
      readinessScore: baseScore,
      predictedLevel: prediction.predictedLevel,
      monthsToReady: prediction.monthsToReady,
      components: {
        compositeScore: prediction.compositeScore,
        reasons: prediction.reasons,
        progressPercent: progress.overallPercent,
        targetCompanyCount,
      } as never,
      predictedAt: now,
    });

    await this.audit.record({
      userId,
      action: 'placement.readiness.predicted',
      entityType: 'readiness_prediction',
      entityId: persisted.id,
      before: undefined,
      after: prediction,
      ip,
    });

    return {
      readinessScore: baseScore,
      predictedLevel: prediction.predictedLevel,
      monthsToReady: prediction.monthsToReady,
      compositeScore: prediction.compositeScore,
      reasons: prediction.reasons,
      predictedAt: now.toISOString(),
    };
  }

  // ---- Daily challenge ----

  async getDailyChallenge(): Promise<unknown> {
    const today = new Date();
    let challenge = await this.repository.findDailyChallenge(today);
    if (!challenge) {
      challenge = await this.repository.createDailyChallenge({
        date: today,
        title: 'Daily DSA Drill',
        description: 'Solve one medium array/string problem and one easy two-pointer problem.',
        taskType: 'dsa',
        reference: 'daily-challenge',
      });
    }
    return {
      id: challenge.id,
      date: challenge.date.toISOString(),
      title: challenge.title,
      description: challenge.description,
      taskType: challenge.taskType,
      reference: challenge.reference,
    };
  }

  // ---- Study planner ----

  async generateStudyPlan(
    userId: string,
    dto: GenerateStudyPlanDto,
    ip?: string,
  ): Promise<unknown> {
    const input = await this.collectRoadmapInput(userId);
    const skillsSummary = input.skills
      .map((skill) => skill.name)
      .slice(0, 12)
      .join(', ');
    const system = [
      'You are a senior placement strategist for computer science students.',
      'Return ONLY a single JSON object that matches the required schema exactly.',
      'Do not include markdown, prose, or anything other than the JSON object.',
    ].join(' ');
    const prompt = [
      `Build a ${dto.weeks ?? 4}-week study plan for target role "${dto.targetRole}".`,
      dto.targetCompanies?.length ? `Target companies: ${dto.targetCompanies.join(', ')}.` : '',
      skillsSummary ? `Known skills: ${skillsSummary}.` : 'No skills recorded yet.',
      dto.hoursPerWeek ? `${dto.hoursPerWeek} hours per week available.` : '',
      'Return a JSON object with keys: title (string), overview (string), and weeks',
      '(array of { week: number, theme: string, goals: string[], activities: string[] }).',
    ]
      .filter(Boolean)
      .join('\n');

    let plan: z.infer<typeof STUDY_PLAN_SCHEMA>;
    try {
      plan = await this.ai.generateStructured<z.infer<typeof STUDY_PLAN_SCHEMA>>({
        system,
        prompt,
        schema: STUDY_PLAN_SCHEMA,
      });
    } catch (err) {
      if (err instanceof AiServiceError) {
        throw new AiServiceError(
          `Study planner could not be generated: ${err.message}`,
          'STUDY_PLAN_GENERATION_FAILED',
        );
      }
      throw err;
    }

    const saved = await this.repository.createStudyPlan({
      userId,
      title: plan.title,
      plan: plan as never,
    });

    await this.audit.record({
      userId,
      action: 'placement.study_plan.generated',
      entityType: 'study_plan',
      entityId: saved.id,
      before: undefined,
      after: { title: plan.title, weeks: plan.weeks.length },
      ip,
    });

    return {
      id: saved.id,
      title: saved.title,
      plan: saved.plan,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  // ---- Input collection ----

  private async collectRoadmapInput(userId: string): Promise<RoadmapInput> {
    const [skills, goals] = await Promise.all([
      this.repository.listSkills(userId),
      this.repository.listCareerGoals(userId),
    ]);
    const activeGoal = goals.find((goal) => goal.status === 'active');
    return {
      targetRole: activeGoal?.targetRole,
      targetCompanies: activeGoal?.targetCompanies ?? [],
      skills: skills.map((skill) => ({
        name: skill.name,
        category: skill.category,
        proficiencyLevel: skill.proficiencyLevel,
      })),
    };
  }
}
