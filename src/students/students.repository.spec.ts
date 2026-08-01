import { PrismaService } from '../prisma/prisma.service';
import { StudentsRepository } from './students.repository';

interface PrismaMock {
  studentProfile: { findUnique: jest.Mock; upsert: jest.Mock };
  skillProfile: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  careerGoal: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  calendarEvent: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  userSettings: { findUnique: jest.Mock; upsert: jest.Mock };
  readinessScore: { findUnique: jest.Mock; upsert: jest.Mock };
  notification: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  activityLog: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
}

function mockPrisma(): PrismaMock {
  return {
    studentProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    skillProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    careerGoal: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    calendarEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
    readinessScore: { findUnique: jest.fn(), upsert: jest.fn() },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    activityLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  };
}

describe('StudentsRepository', () => {
  let prisma: PrismaMock;
  let repository: StudentsRepository;

  beforeEach(() => {
    prisma = mockPrisma();
    repository = new StudentsRepository(prisma as unknown as PrismaService);
  });

  it('finds a profile by user id', async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({ id: 'p1' });
    await repository.findProfileByUserId('u1');
    expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('counts skills for the user with optional category filter', async () => {
    prisma.skillProfile.count.mockResolvedValue(2);
    expect(await repository.countSkills('u1')).toBe(2);
    await repository.countSkills('u1', 'dsa');
    expect(prisma.skillProfile.count).toHaveBeenLastCalledWith({
      where: { userId: 'u1', category: 'dsa' },
    });
  });

  it('creates a skill with defaults', async () => {
    prisma.skillProfile.create.mockResolvedValue({ id: 'sk1' });
    await repository.createSkill({ userId: 'u1', name: 'Go' });
    expect(prisma.skillProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        name: 'Go',
        category: 'other',
        proficiencyLevel: 'intermediate',
        yearsOfExperience: 0,
        isPrimary: false,
      },
    });
  });

  it('updates a skill with only the provided fields', async () => {
    prisma.skillProfile.update.mockResolvedValue({ id: 'sk1' });
    await repository.updateSkill('sk1', 'u1', { name: 'Go', category: 'programming' });
    expect(prisma.skillProfile.update).toHaveBeenCalledWith({
      where: { id: 'sk1' },
      data: { name: 'Go', category: 'programming' },
    });
  });

  it('finds a skill by name case-insensitively', async () => {
    prisma.skillProfile.findFirst.mockResolvedValue({ id: 'sk1' });
    await repository.findSkillByName('u1', 'typescript');
    expect(prisma.skillProfile.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', name: { equals: 'typescript', mode: 'insensitive' } },
    });
  });

  it('upserts a profile, creating when absent', async () => {
    prisma.studentProfile.upsert.mockResolvedValue({ id: 'p1' });
    await repository.upsertProfile('u1', { headline: 'x' });
    expect(prisma.studentProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', headline: 'x' },
      update: { headline: 'x' },
    });
  });

  it('lists skills scoped to the user with optional category filter', async () => {
    prisma.skillProfile.findMany.mockResolvedValue([]);
    await repository.listSkills({ userId: 'u1', skip: 0, take: 20 });
    expect(prisma.skillProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, skip: 0, take: 20 }),
    );
    await repository.listSkills({ userId: 'u1', skip: 0, take: 20, category: 'dsa' });
    expect(prisma.skillProfile.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: 'u1', category: 'dsa' } }),
    );
  });

  it('finds a skill scoped to the user', async () => {
    prisma.skillProfile.findFirst.mockResolvedValue({ id: 'sk1' });
    await repository.findSkillById('sk1', 'u1');
    expect(prisma.skillProfile.findFirst).toHaveBeenCalledWith({
      where: { id: 'sk1', userId: 'u1' },
    });
  });

  it('deletes a skill scoped to the user and returns the count', async () => {
    prisma.skillProfile.deleteMany.mockResolvedValue({ count: 1 });
    const result = await repository.deleteSkill('sk1', 'u1');
    expect(result.count).toBe(1);
    expect(prisma.skillProfile.deleteMany).toHaveBeenCalledWith({
      where: { id: 'sk1', userId: 'u1' },
    });
  });

  it('lists career goals scoped to the user with optional status filter', async () => {
    prisma.careerGoal.findMany.mockResolvedValue([]);
    await repository.listCareerGoals({ userId: 'u1', skip: 0, take: 20, status: 'active' });
    expect(prisma.careerGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', status: 'active' } }),
    );
  });

  it('counts active career goals', async () => {
    prisma.careerGoal.count.mockResolvedValue(2);
    expect(await repository.countActiveCareerGoals('u1')).toBe(2);
    expect(prisma.careerGoal.count).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'active' },
    });
  });

  it('counts career goals with optional status', async () => {
    prisma.careerGoal.count.mockResolvedValue(3);
    expect(await repository.countCareerGoals('u1')).toBe(3);
    await repository.countCareerGoals('u1', 'active');
    expect(prisma.careerGoal.count).toHaveBeenLastCalledWith({
      where: { userId: 'u1', status: 'active' },
    });
  });

  it('finds a career goal scoped to the user', async () => {
    prisma.careerGoal.findFirst.mockResolvedValue({ id: 'g1' });
    await repository.findCareerGoalById('g1', 'u1');
    expect(prisma.careerGoal.findFirst).toHaveBeenCalledWith({
      where: { id: 'g1', userId: 'u1' },
    });
  });

  it('creates a career goal', async () => {
    prisma.careerGoal.create.mockResolvedValue({ id: 'g1' });
    await repository.createCareerGoal({ userId: 'u1', title: 'SDE' });
    expect(prisma.careerGoal.create).toHaveBeenCalledWith({
      data: { userId: 'u1', title: 'SDE' },
    });
  });

  it('updates a career goal', async () => {
    prisma.careerGoal.update.mockResolvedValue({ id: 'g1' });
    await repository.updateCareerGoal('g1', 'u1', { status: 'achieved' });
    expect(prisma.careerGoal.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { status: 'achieved' },
    });
  });

  it('deletes a career goal scoped to the user', async () => {
    prisma.careerGoal.deleteMany.mockResolvedValue({ count: 1 });
    await repository.deleteCareerGoal('g1', 'u1');
    expect(prisma.careerGoal.deleteMany).toHaveBeenCalledWith({
      where: { id: 'g1', userId: 'u1' },
    });
  });

  it('lists calendar events scoped to the user with date filters', async () => {
    prisma.calendarEvent.findMany.mockResolvedValue([]);
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-31T00:00:00.000Z');
    await repository.listCalendarEvents({ userId: 'u1', skip: 0, take: 20, from, to });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'u1',
          startAt: { gte: from, lte: to },
        },
        orderBy: { startAt: 'asc' },
      }),
    );
  });

  it('finds upcoming events from a timestamp', async () => {
    prisma.calendarEvent.findMany.mockResolvedValue([]);
    const from = new Date('2026-08-01T00:00:00.000Z');
    await repository.findUpcomingEvents('u1', from, 5);
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', startAt: { gte: from } },
      orderBy: { startAt: 'asc' },
      take: 5,
    });
  });

  it('counts calendar events with optional filters', async () => {
    prisma.calendarEvent.count.mockResolvedValue(2);
    expect(await repository.countCalendarEvents({ userId: 'u1' })).toBe(2);
    await repository.countCalendarEvents({ userId: 'u1', eventType: 'interview' });
    expect(prisma.calendarEvent.count).toHaveBeenLastCalledWith({
      where: { userId: 'u1', eventType: 'interview' },
    });
  });

  it('finds a calendar event scoped to the user', async () => {
    prisma.calendarEvent.findFirst.mockResolvedValue({ id: 'ev1' });
    await repository.findCalendarEventById('ev1', 'u1');
    expect(prisma.calendarEvent.findFirst).toHaveBeenCalledWith({
      where: { id: 'ev1', userId: 'u1' },
    });
  });

  it('creates a calendar event', async () => {
    prisma.calendarEvent.create.mockResolvedValue({ id: 'ev1' });
    await repository.createCalendarEvent({ userId: 'u1', title: 'X', startAt: new Date() });
    expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'X' }) }),
    );
  });

  it('updates a calendar event', async () => {
    prisma.calendarEvent.update.mockResolvedValue({ id: 'ev1' });
    await repository.updateCalendarEvent('ev1', 'u1', { title: 'Y' });
    expect(prisma.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: 'ev1' },
      data: { title: 'Y' },
    });
  });

  it('deletes a calendar event scoped to the user', async () => {
    prisma.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });
    await repository.deleteCalendarEvent('ev1', 'u1');
    expect(prisma.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: 'ev1', userId: 'u1' },
    });
  });

  it('finds settings by user id', async () => {
    prisma.userSettings.findUnique.mockResolvedValue({ id: 'st1' });
    await repository.findSettingsByUserId('u1');
    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('upserts settings for a user', async () => {
    prisma.userSettings.upsert.mockResolvedValue({ id: 'st1' });
    await repository.upsertSettings('u1', { theme: 'dark' });
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', theme: 'dark' },
      update: { theme: 'dark' },
    });
  });

  it('upserts a readiness score', async () => {
    prisma.readinessScore.upsert.mockResolvedValue({ id: 'r1' });
    const components = { profile: 1 };
    await repository.upsertReadinessScore('u1', {
      overall: 50,
      components: components as never,
      calculatedAt: new Date(),
    });
    expect(prisma.readinessScore.upsert).toHaveBeenCalled();
  });

  it('finds the readiness score for a user', async () => {
    prisma.readinessScore.findUnique.mockResolvedValue({ id: 'r1' });
    await repository.findReadinessScore('u1');
    expect(prisma.readinessScore.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('lists notifications with optional unread filter', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await repository.listNotifications({ userId: 'u1', skip: 0, take: 20, unreadOnly: true });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
    );
    await repository.listNotifications({ userId: 'u1', skip: 0, take: 20 });
    expect(prisma.notification.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('counts notifications with optional unread filter', async () => {
    prisma.notification.count.mockResolvedValue(4);
    expect(await repository.countNotifications('u1')).toBe(4);
    await repository.countNotifications('u1', true);
    expect(prisma.notification.count).toHaveBeenLastCalledWith({
      where: { userId: 'u1', isRead: false },
    });
  });

  it('finds a notification scoped to the user', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'ntf1' });
    await repository.findNotificationById('ntf1', 'u1');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'ntf1', userId: 'u1' },
    });
  });

  it('counts unread notifications', async () => {
    prisma.notification.count.mockResolvedValue(3);
    expect(await repository.countUnreadNotifications('u1')).toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
    });
  });

  it('marks one notification read only if currently unread', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date();
    await repository.markNotificationRead('ntf1', 'u1', now);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'ntf1', userId: 'u1', isRead: false },
      data: { isRead: true, readAt: now },
    });
  });

  it('marks all notifications read and returns the count', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 5 });
    const now = new Date();
    const result = await repository.markAllNotificationsRead('u1', now);
    expect(result.count).toBe(5);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
      data: { isRead: true, readAt: now },
    });
  });

  it('creates a notification', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'ntf1' });
    await repository.createNotification({
      userId: 'u1',
      type: 'placement',
      title: 'T',
      message: 'M',
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'placement', title: 'T', message: 'M' },
    });
  });

  it('lists activity scoped to the user', async () => {
    prisma.activityLog.findMany.mockResolvedValue([]);
    await repository.listActivity('u1', 0, 20);
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('counts all activity for the user', async () => {
    prisma.activityLog.count.mockResolvedValue(7);
    expect(await repository.countActivity('u1')).toBe(7);
    expect(prisma.activityLog.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('creates an activity log entry', async () => {
    prisma.activityLog.create.mockResolvedValue({ id: 'a1' });
    await repository.createActivityLog({ userId: 'u1', type: 'skill', title: 'Skill added' });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'skill', title: 'Skill added' },
    });
  });

  it('counts recent activity excluding readiness recalculations', async () => {
    prisma.activityLog.count.mockResolvedValue(2);
    const since = new Date('2026-07-01T00:00:00.000Z');
    expect(await repository.countRecentActivity('u1', since)).toBe(2);
    expect(prisma.activityLog.count).toHaveBeenCalledWith({
      where: { userId: 'u1', createdAt: { gte: since }, type: { not: 'readiness' } },
    });
  });
});
