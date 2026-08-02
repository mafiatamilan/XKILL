import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoadmapWeekSpec } from './roadmap-generator';

const roadmapWithTasks = Prisma.validator<Prisma.RoadmapWeekDefaultArgs>()({
  include: { tasks: { orderBy: { day: 'asc' } } },
});
export type RoadmapWeekWithTasks = Prisma.RoadmapWeekGetPayload<typeof roadmapWithTasks>;

void roadmapWithTasks;

@Injectable()
export class PlacementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Roadmap ----

  findRoadmapWeeks(userId: string): Promise<RoadmapWeekWithTasks[]> {
    return this.prisma.roadmapWeek.findMany({
      where: { userId },
      include: { tasks: { orderBy: { day: 'asc' } } },
      orderBy: { weekNumber: 'asc' },
    });
  }

  findRoadmapWeek(userId: string, weekNumber: number): Promise<RoadmapWeekWithTasks | null> {
    return this.prisma.roadmapWeek.findFirst({
      where: { userId, weekNumber },
      include: { tasks: { orderBy: { day: 'asc' } } },
    });
  }

  async createRoadmap(userId: string, weeks: RoadmapWeekSpec[]): Promise<RoadmapWeekWithTasks[]> {
    await this.prisma.roadmapWeek.createMany({
      data: weeks.map((week) => ({
        userId,
        weekNumber: week.weekNumber,
        title: week.title,
        focus: week.focus,
      })),
      skipDuplicates: true,
    });

    const created = await this.prisma.roadmapWeek.findMany({
      where: { userId },
      orderBy: { weekNumber: 'asc' },
    });
    const weekIdByNumber = new Map(created.map((week) => [week.weekNumber, week.id]));

    const tasks: Prisma.DailyTaskUncheckedCreateInput[] = [];
    for (const week of weeks) {
      const weekId = weekIdByNumber.get(week.weekNumber);
      if (!weekId) continue;
      for (const task of week.tasks) {
        tasks.push({
          roadmapWeekId: weekId,
          day: task.day,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          reference: task.reference,
        });
      }
    }
    if (tasks.length > 0) {
      await this.prisma.dailyTask.createMany({ data: tasks });
    }

    return this.findRoadmapWeeks(userId);
  }

  findTaskById(taskId: string, userId: string) {
    return this.prisma.dailyTask.findFirst({
      where: { id: taskId, roadmapWeek: { userId } },
    });
  }

  completeTask(taskId: string, userId: string, now: Date) {
    return this.prisma.dailyTask.updateMany({
      where: { id: taskId, roadmapWeek: { userId }, isCompleted: false },
      data: { isCompleted: true, completedAt: now },
    });
  }

  // ---- Company prep ----

  findCompanyTrack(company: string) {
    return this.prisma.companyPrepTrack.findFirst({
      where: { company: { equals: company, mode: 'insensitive' }, isActive: true },
    });
  }

  // ---- Progress ----

  upsertProgressRecord(
    userId: string,
    data: { totalTasks: number; completed: number; percent: number; recordedAt: Date },
  ) {
    return this.prisma.progressRecord.create({ data: { ...data, userId } });
  }

  findLatestProgressRecord(userId: string) {
    return this.prisma.progressRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ---- Readiness prediction ----

  upsertReadinessPrediction(
    userId: string,
    data: {
      readinessScore: number;
      predictedLevel: string;
      monthsToReady: number;
      components: Prisma.InputJsonValue;
      predictedAt: Date;
    },
  ) {
    return this.prisma.readinessPrediction.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  findReadinessPrediction(userId: string) {
    return this.prisma.readinessPrediction.findUnique({ where: { userId } });
  }

  // ---- Daily challenge ----

  findDailyChallenge(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.prisma.dailyChallenge.findFirst({
      where: { date: { gte: start, lt: end } },
    });
  }

  createDailyChallenge(data: {
    date: Date;
    title: string;
    description: string;
    taskType: string;
    reference?: string;
  }) {
    return this.prisma.dailyChallenge.create({ data });
  }

  // ---- Study plan ----

  findStudyPlanById(id: string, userId: string) {
    return this.prisma.studyPlan.findFirst({ where: { id, userId } });
  }

  createStudyPlan(data: { userId: string; title: string; plan: Prisma.InputJsonValue }) {
    return this.prisma.studyPlan.create({ data });
  }

  listStudyPlans(userId: string, take: number) {
    return this.prisma.studyPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ---- Student state (readiness inputs) ----

  findStudentProfile(userId: string) {
    return this.prisma.studentProfile.findUnique({ where: { userId } });
  }

  listSkills(userId: string) {
    return this.prisma.skillProfile.findMany({ where: { userId }, take: 100 });
  }

  listCareerGoals(userId: string) {
    return this.prisma.careerGoal.findMany({ where: { userId }, take: 100 });
  }

  findReadinessScore(userId: string) {
    return this.prisma.readinessScore.findUnique({ where: { userId } });
  }

  upsertReadinessScore(
    userId: string,
    data: { overall: number; components: Prisma.InputJsonValue; calculatedAt: Date },
  ) {
    return this.prisma.readinessScore.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  countRecentActivity(userId: string, since: Date): Promise<number> {
    return this.prisma.activityLog.count({
      where: { userId, createdAt: { gte: since }, type: { not: 'readiness' } },
    });
  }

  countNotifications(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId } });
  }
}
