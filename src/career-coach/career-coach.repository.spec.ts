import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CareerCoachRepository } from './career-coach.repository';

describe('CareerCoachRepository', () => {
  let repository: CareerCoachRepository;
  let prisma: {
    careerGoal: Record<string, jest.Mock>;
    skillProfile: Record<string, jest.Mock>;
    careerRoadmapItem: Record<string, jest.Mock>;
    learningRecommendation: Record<string, jest.Mock>;
    salaryPrediction: Record<string, jest.Mock>;
    skillGap: Record<string, jest.Mock>;
    careerChatMessage: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CareerCoachRepository,
        {
          provide: PrismaService,
          useValue: {
            careerGoal: { findFirst: jest.fn() },
            skillProfile: { findMany: jest.fn() },
            careerRoadmapItem: {
              deleteMany: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
            },
            learningRecommendation: {
              deleteMany: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
            },
            salaryPrediction: { upsert: jest.fn(), findUnique: jest.fn() },
            skillGap: { upsert: jest.fn(), findUnique: jest.fn() },
            careerChatMessage: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
            $transaction: jest.fn().mockImplementation(async (ops: unknown[]) => ops),
          },
        },
      ],
    }).compile();
    repository = module.get(CareerCoachRepository);
    prisma = module.get(PrismaService) as unknown as typeof prisma;
  });

  it('finds the most recent active career goal for a user', async () => {
    prisma.careerGoal.findFirst.mockResolvedValue({ id: 'g1' });
    await repository.findActiveCareerGoal('u1');
    expect(prisma.careerGoal.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: expect.objectContaining({ id: true, targetRole: true }),
    });
  });

  it('lists skill profile rows ordered by primary then proficiency', async () => {
    prisma.skillProfile.findMany.mockResolvedValue([]);
    await repository.findSkillProfile('u1');
    expect(prisma.skillProfile.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ isPrimary: 'desc' }, { proficiencyLevel: 'asc' }],
      take: 20,
      select: expect.objectContaining({ name: true }),
    });
  });

  it('replaces the roadmap for a user in one transaction', async () => {
    const items = [
      {
        phase: 1,
        title: 'T',
        duration: '0-3 months',
        summary: 'S',
        focus: ['F'],
        milestones: ['M'],
      },
    ];
    await repository.replaceRoadmap('u1', 'g1', items);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.careerRoadmapItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.careerRoadmapItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'u1',
          careerGoalId: 'g1',
          phase: 1,
          title: 'T',
          duration: '0-3 months',
          summary: 'S',
          focus: ['F'],
          milestones: ['M'],
        },
      ],
    });
  });

  it('lists roadmap items ordered by phase', async () => {
    prisma.careerRoadmapItem.findMany.mockResolvedValue([]);
    await repository.listRoadmap('u1');
    expect(prisma.careerRoadmapItem.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { phase: 'asc' },
    });
  });

  it('replaces learning recommendations for a user', async () => {
    await repository.replaceRecommendations('u1', [
      { skill: 'SQL', title: 'T', resourceType: 'course', provider: 'C', priority: 1, reason: 'R' },
    ]);
    expect(prisma.learningRecommendation.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'u1',
          skill: 'SQL',
          title: 'T',
          resourceType: 'course',
          provider: 'C',
          url: null,
          priority: 1,
          reason: 'R',
        },
      ],
    });
  });

  it('upserts a salary prediction', async () => {
    prisma.salaryPrediction.upsert.mockResolvedValue({ id: 'sp1' });
    const result = await repository.upsertSalaryPrediction({
      userId: 'u1',
      targetRole: 'Backend Engineer',
      targetCompany: 'Google',
      baseLakhs: 24,
      totalCtcLakhs: 28,
      rangeLowLakhs: 20,
      rangeHighLakhs: 32,
      confidence: 70,
      isEstimate: true,
      factors: ['factor'],
    });
    expect(result).toEqual({ id: 'sp1' });
    expect(prisma.salaryPrediction.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: expect.objectContaining({ targetCompany: 'Google', factors: ['factor'] }),
      create: expect.objectContaining({ targetCompany: 'Google', factors: ['factor'] }),
    });
  });

  it('finds a salary prediction by user', async () => {
    prisma.salaryPrediction.findUnique.mockResolvedValue({ id: 'sp1' });
    await repository.findSalaryPrediction('u1');
    expect(prisma.salaryPrediction.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('upserts a skill gap', async () => {
    prisma.skillGap.upsert.mockResolvedValue({ id: 'sg1' });
    await repository.upsertSkillGap({
      userId: 'u1',
      targetRole: 'Backend Engineer',
      missing: ['SQL'],
      present: ['Java'],
      coverage: 0.5,
    });
    expect(prisma.skillGap.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: expect.objectContaining({ missing: ['SQL'], coverage: 0.5 }),
      create: expect.objectContaining({ missing: ['SQL'], coverage: 0.5 }),
    });
  });

  it('creates a chat message', async () => {
    prisma.careerChatMessage.create.mockResolvedValue({ id: 'm1' });
    await repository.createChatMessage('u1', 'user', 'hi');
    expect(prisma.careerChatMessage.create).toHaveBeenCalledWith({
      data: { userId: 'u1', role: 'user', content: 'hi' },
    });
  });

  it('counts and lists chat messages with pagination', async () => {
    prisma.careerChatMessage.count.mockResolvedValue(5);
    prisma.careerChatMessage.findMany.mockResolvedValue([]);
    await repository.countChatMessages('u1');
    await repository.listChatMessages('u1', 2, 10);
    expect(prisma.careerChatMessage.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.careerChatMessage.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
  });
});
