import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PlacementRepository } from './placement.repository';

describe('PlacementRepository', () => {
  let repository: PlacementRepository;
  let prisma: {
    roadmapWeek: Record<string, jest.Mock>;
    dailyTask: Record<string, jest.Mock>;
    companyPrepTrack: Record<string, jest.Mock>;
    progressRecord: Record<string, jest.Mock>;
    readinessPrediction: Record<string, jest.Mock>;
    readinessScore: Record<string, jest.Mock>;
    dailyChallenge: Record<string, jest.Mock>;
    studyPlan: Record<string, jest.Mock>;
    studentProfile: Record<string, jest.Mock>;
    skillProfile: Record<string, jest.Mock>;
    careerGoal: Record<string, jest.Mock>;
    activityLog: Record<string, jest.Mock>;
    notification: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlacementRepository,
        {
          provide: PrismaService,
          useValue: {
            roadmapWeek: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              createMany: jest.fn(),
            },
            dailyTask: { createMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
            companyPrepTrack: { findFirst: jest.fn() },
            progressRecord: { create: jest.fn(), findFirst: jest.fn() },
            readinessPrediction: { upsert: jest.fn(), findUnique: jest.fn() },
            readinessScore: { findUnique: jest.fn(), upsert: jest.fn() },
            dailyChallenge: { findFirst: jest.fn(), create: jest.fn() },
            studyPlan: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
            studentProfile: { findUnique: jest.fn() },
            skillProfile: { findMany: jest.fn() },
            careerGoal: { findMany: jest.fn() },
            activityLog: { count: jest.fn() },
            notification: { count: jest.fn() },
          },
        },
      ],
    }).compile();

    repository = module.get(PlacementRepository);
    prisma = module.get(PrismaService) as never;
  });

  it('finds roadmap weeks with ordered tasks', async () => {
    prisma.roadmapWeek.findMany.mockResolvedValue([{ id: 'w1' }]);
    const result = await repository.findRoadmapWeeks('u1');
    expect(result).toHaveLength(1);
    expect(prisma.roadmapWeek.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('creates a full roadmap with weeks and tasks', async () => {
    prisma.roadmapWeek.createMany.mockResolvedValue({ count: 2 });
    prisma.roadmapWeek.findMany.mockResolvedValueOnce([
      { id: 'w1', weekNumber: 1 },
      { id: 'w2', weekNumber: 2 },
    ]);
    prisma.dailyTask.createMany.mockResolvedValue({ count: 14 });
    prisma.roadmapWeek.findMany.mockResolvedValueOnce([
      {
        id: 'w1',
        weekNumber: 1,
        title: 'W1',
        focus: 'f',
        tasks: [{ id: 't1' }],
      },
    ]);

    const result = await repository.createRoadmap('u1', [
      {
        weekNumber: 1,
        title: 'W1',
        focus: 'f',
        tasks: [
          {
            day: 1,
            title: 'T',
            description: 'd',
            taskType: 'dsa',
          },
        ],
      },
    ]);

    expect(prisma.dailyTask.createMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('finds a task scoped to the owning user', async () => {
    prisma.dailyTask.findFirst.mockResolvedValue({ id: 't1' });
    const result = await repository.findTaskById('t1', 'u1');
    expect(result?.id).toBe('t1');
    expect(prisma.dailyTask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 't1' }) }),
    );
  });

  it('finds a company track case-insensitively', async () => {
    prisma.companyPrepTrack.findFirst.mockResolvedValue({ company: 'Google' });
    const result = await repository.findCompanyTrack('google');
    expect(result?.company).toBe('Google');
    expect(prisma.companyPrepTrack.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ company: { equals: 'google', mode: 'insensitive' } }),
      }),
    );
  });

  it('upserts a readiness prediction', async () => {
    prisma.readinessPrediction.upsert.mockResolvedValue({ id: 'p1' });
    const result = await repository.upsertReadinessPrediction('u1', {
      readinessScore: 80,
      predictedLevel: 'high',
      monthsToReady: 1,
      components: {},
      predictedAt: new Date(),
    });
    expect(result?.id).toBe('p1');
  });

  it('finds today\u2019s daily challenge within the day window', async () => {
    prisma.dailyChallenge.findFirst.mockResolvedValue({ id: 'dc1' });
    const result = await repository.findDailyChallenge(new Date('2026-08-02T10:00:00Z'));
    expect(result?.id).toBe('dc1');
    const where = prisma.dailyChallenge.findFirst.mock.calls[0][0].where;
    expect(where.date.gte).toBeInstanceOf(Date);
    expect(where.date.lt).toBeInstanceOf(Date);
    expect(where.date.lt.getTime()).toBeGreaterThan(where.date.gte.getTime());
  });

  it('creates a study plan', async () => {
    prisma.studyPlan.create.mockResolvedValue({ id: 'sp1' });
    const result = await repository.createStudyPlan({ userId: 'u1', title: 'Plan', plan: {} });
    expect(result?.id).toBe('sp1');
  });

  it('counts recent activity and notifications for readiness inputs', async () => {
    prisma.activityLog.count.mockResolvedValue(3);
    prisma.notification.count.mockResolvedValue(2);
    expect(await repository.countRecentActivity('u1', new Date())).toBe(3);
    expect(await repository.countNotifications('u1')).toBe(2);
  });
});
