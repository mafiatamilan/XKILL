import { Injectable } from '@nestjs/common';
import { Prisma, SkillProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './dto/notification.dto';

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Profile ----

  findProfileByUserId(userId: string) {
    return this.prisma.studentProfile.findUnique({ where: { userId } });
  }

  upsertProfile(
    userId: string,
    data: Omit<Prisma.StudentProfileUncheckedCreateInput, 'userId' | 'user'>,
  ) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // ---- Skills ----

  listSkills(params: { userId: string; skip: number; take: number; category?: string }) {
    const where: Prisma.SkillProfileWhereInput = {
      userId: params.userId,
      ...(params.category ? { category: params.category } : {}),
    };
    return this.prisma.skillProfile.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { proficiencyLevel: 'desc' }, { createdAt: 'desc' }],
      skip: params.skip,
      take: params.take,
    });
  }

  countSkills(userId: string, category?: string): Promise<number> {
    const where: Prisma.SkillProfileWhereInput = {
      userId,
      ...(category ? { category } : {}),
    };
    return this.prisma.skillProfile.count({ where });
  }

  findSkillById(id: string, userId: string): Promise<SkillProfile | null> {
    return this.prisma.skillProfile.findFirst({ where: { id, userId } });
  }

  createSkill(data: {
    userId: string;
    name: string;
    category?: string;
    proficiencyLevel?: string;
    yearsOfExperience?: number;
    isPrimary?: boolean;
  }) {
    return this.prisma.skillProfile.create({
      data: {
        userId: data.userId,
        name: data.name,
        category: data.category ?? 'other',
        proficiencyLevel: data.proficiencyLevel ?? 'intermediate',
        yearsOfExperience: data.yearsOfExperience ?? 0,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  updateSkill(
    id: string,
    userId: string,
    data: {
      name?: string;
      category?: string;
      proficiencyLevel?: string;
      yearsOfExperience?: number;
      isPrimary?: boolean;
    },
  ) {
    return this.prisma.skillProfile.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.proficiencyLevel !== undefined ? { proficiencyLevel: data.proficiencyLevel } : {}),
        ...(data.yearsOfExperience !== undefined
          ? { yearsOfExperience: data.yearsOfExperience }
          : {}),
        ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      },
    });
  }

  deleteSkill(id: string, userId: string) {
    return this.prisma.skillProfile.deleteMany({ where: { id, userId } });
  }

  findSkillByName(userId: string, name: string) {
    return this.prisma.skillProfile.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
    });
  }

  // ---- Career goals ----

  listCareerGoals(params: { userId: string; skip: number; take: number; status?: string }) {
    const where: Prisma.CareerGoalWhereInput = {
      userId: params.userId,
      ...(params.status ? { status: params.status } : {}),
    };
    return this.prisma.careerGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  countCareerGoals(userId: string, status?: string): Promise<number> {
    const where: Prisma.CareerGoalWhereInput = { userId, ...(status ? { status } : {}) };
    return this.prisma.careerGoal.count({ where });
  }

  countActiveCareerGoals(userId: string): Promise<number> {
    return this.prisma.careerGoal.count({ where: { userId, status: 'active' } });
  }

  findCareerGoalById(id: string, userId: string) {
    return this.prisma.careerGoal.findFirst({ where: { id, userId } });
  }

  createCareerGoal(data: {
    userId: string;
    title: string;
    targetRole?: string;
    targetCompanies?: string[];
    industries?: string[];
    preferredLocations?: string[];
    targetCtcLakhs?: number;
    targetDate?: Date;
    status?: string;
    notes?: string;
  }) {
    return this.prisma.careerGoal.create({ data });
  }

  updateCareerGoal(
    id: string,
    userId: string,
    data: {
      title?: string;
      targetRole?: string;
      targetCompanies?: string[];
      industries?: string[];
      preferredLocations?: string[];
      targetCtcLakhs?: number;
      targetDate?: Date;
      status?: string;
      notes?: string;
    },
  ) {
    return this.prisma.careerGoal.update({ where: { id }, data });
  }

  deleteCareerGoal(id: string, userId: string) {
    return this.prisma.careerGoal.deleteMany({ where: { id, userId } });
  }

  // ---- Calendar ----

  listCalendarEvents(params: {
    userId: string;
    skip: number;
    take: number;
    eventType?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.CalendarEventWhereInput = {
      userId: params.userId,
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.from || params.to
        ? {
            startAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
      skip: params.skip,
      take: params.take,
    });
  }

  countCalendarEvents(params: {
    userId: string;
    eventType?: string;
    from?: Date;
    to?: Date;
  }): Promise<number> {
    const where: Prisma.CalendarEventWhereInput = {
      userId: params.userId,
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.from || params.to
        ? {
            startAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.calendarEvent.count({ where });
  }

  findCalendarEventById(id: string, userId: string) {
    return this.prisma.calendarEvent.findFirst({ where: { id, userId } });
  }

  createCalendarEvent(data: {
    userId: string;
    title: string;
    description?: string;
    eventType?: string;
    startAt: Date;
    endAt?: Date;
    location?: string;
    isAllDay?: boolean;
    color?: string;
    reminderAt?: Date;
  }) {
    return this.prisma.calendarEvent.create({ data });
  }

  updateCalendarEvent(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      eventType?: string;
      startAt?: Date;
      endAt?: Date;
      location?: string;
      isAllDay?: boolean;
      color?: string;
      reminderAt?: Date;
    },
  ) {
    return this.prisma.calendarEvent.update({ where: { id }, data });
  }

  deleteCalendarEvent(id: string, userId: string) {
    return this.prisma.calendarEvent.deleteMany({ where: { id, userId } });
  }

  findUpcomingEvents(userId: string, from: Date, take: number) {
    return this.prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: from } },
      orderBy: { startAt: 'asc' },
      take,
    });
  }

  // ---- Settings ----

  findSettingsByUserId(userId: string) {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  upsertSettings(
    userId: string,
    data: Omit<Prisma.UserSettingsUncheckedCreateInput, 'userId' | 'user'>,
  ) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // ---- Readiness ----

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

  // ---- Notifications ----

  listNotifications(params: { userId: string; skip: number; take: number; unreadOnly?: boolean }) {
    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  countNotifications(userId: string, unreadOnly?: boolean): Promise<number> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };
    return this.prisma.notification.count({ where });
  }

  countUnreadNotifications(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  findNotificationById(id: string, userId: string) {
    return this.prisma.notification.findFirst({ where: { id, userId } });
  }

  markNotificationRead(id: string, userId: string, now: Date) {
    return this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
  }

  markAllNotificationsRead(userId: string, now: Date) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
  }

  createNotification(data: {
    userId: string;
    type: NotificationType | string;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.notification.create({ data });
  }

  // ---- Activity ----

  listActivity(userId: string, skip: number, take: number) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countActivity(userId: string): Promise<number> {
    return this.prisma.activityLog.count({ where: { userId } });
  }

  countRecentActivity(userId: string, since: Date): Promise<number> {
    return this.prisma.activityLog.count({
      where: { userId, createdAt: { gte: since }, type: { not: 'readiness' } },
    });
  }

  createActivityLog(data: { userId: string; type: string; title: string; description?: string }) {
    return this.prisma.activityLog.create({ data });
  }
}
