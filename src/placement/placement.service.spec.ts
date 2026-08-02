import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { PlacementRepository } from './placement.repository';
import { PlacementService } from './placement.service';

describe('PlacementService', () => {
  const asAny = (value: unknown): any => value;
  let service: PlacementService;
  let repository: {
    findRoadmapWeeks: jest.Mock;
    findRoadmapWeek: jest.Mock;
    createRoadmap: jest.Mock;
    findTaskById: jest.Mock;
    completeTask: jest.Mock;
    findCompanyTrack: jest.Mock;
    upsertProgressRecord: jest.Mock;
    findReadinessScore: jest.Mock;
    listCareerGoals: jest.Mock;
    listSkills: jest.Mock;
    upsertReadinessPrediction: jest.Mock;
    findDailyChallenge: jest.Mock;
    createDailyChallenge: jest.Mock;
    createStudyPlan: jest.Mock;
    findStudentProfile: jest.Mock;
    countRecentActivity: jest.Mock;
    countNotifications: jest.Mock;
  };
  let ai: { generateStructured: jest.Mock };

  const task = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    day: 1,
    title: 'Concept mastery',
    description: 'Study',
    taskType: 'dsa',
    reference: null,
    isCompleted: false,
    completedAt: null,
    ...overrides,
  });

  const week = (number: number, tasksArr: unknown[] = []) => ({
    id: `week-${number}`,
    weekNumber: number,
    title: `Week ${number}`,
    focus: 'focus',
    tasks: tasksArr,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlacementService,
        {
          provide: PlacementRepository,
          useValue: {
            findRoadmapWeeks: jest.fn(),
            findRoadmapWeek: jest.fn(),
            createRoadmap: jest.fn(),
            findTaskById: jest.fn(),
            completeTask: jest.fn(),
            findCompanyTrack: jest.fn(),
            upsertProgressRecord: jest.fn(),
            findReadinessScore: jest.fn(),
            listCareerGoals: jest.fn(),
            listSkills: jest.fn(),
            upsertReadinessPrediction: jest.fn(),
            findDailyChallenge: jest.fn(),
            createDailyChallenge: jest.fn(),
            createStudyPlan: jest.fn(),
            findStudentProfile: jest.fn(),
            countRecentActivity: jest.fn(),
            countNotifications: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: { generateStructured: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(PlacementService);
    repository = module.get(PlacementRepository) as never;
    ai = module.get(AiService) as never;
  });

  describe('getRoadmap', () => {
    it('returns the persisted roadmap when one exists', async () => {
      repository.findRoadmapWeeks.mockResolvedValue([
        week(1, [task('t1', { isCompleted: true }), task('t2')]),
      ]);

      const result = asAny(await service.getRoadmap('u1'));

      expect(result.weeks).toHaveLength(1);
      expect(result.weeks[0].tasks[0].isCompleted).toBe(true);
      expect(repository.createRoadmap).not.toHaveBeenCalled();
      expect(result.overallPercent).toBe(50);
    });

    it('generates a roadmap on first access using the student skills and goals', async () => {
      repository.findRoadmapWeeks.mockResolvedValue([]);
      repository.listSkills.mockResolvedValue([
        { id: 's1', name: 'Java', category: 'programming', proficiencyLevel: 'intermediate' },
      ]);
      repository.listCareerGoals.mockResolvedValue([
        { id: 'g1', status: 'active', targetRole: 'SDE', targetCompanies: ['Google'] },
      ]);
      repository.createRoadmap.mockImplementation((_userId, weeks) => Promise.resolve(weeks));

      const result = asAny(await service.getRoadmap('u1'));

      expect(repository.createRoadmap).toHaveBeenCalledTimes(1);
      expect(result.weeks).toHaveLength(10);
      expect(result.weeks[0].tasks).toHaveLength(7);
    });
  });

  describe('getWeekTasks', () => {
    it('returns the week tasks', async () => {
      repository.findRoadmapWeek.mockResolvedValue(week(2, [task('t1')]));
      const result = asAny(await service.getWeekTasks('u1', 2));
      expect(result.weekNumber).toBe(2);
      expect(result.tasks).toHaveLength(1);
    });

    it('throws 404 for a missing week', async () => {
      repository.findRoadmapWeek.mockResolvedValue(null);
      await expect(service.getWeekTasks('u1', 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeTask', () => {
    it('marks a pending task complete', async () => {
      repository.findTaskById.mockResolvedValue(task('t1'));
      repository.completeTask.mockResolvedValue({ count: 1 });

      const result = asAny(await service.completeTask('u1', 't1'));

      expect(result.isCompleted).toBe(true);
      expect(result.completedAt).toBeDefined();
    });

    it('throws 404 for a task owned by another user', async () => {
      repository.findTaskById.mockResolvedValue(null);
      await expect(service.completeTask('u1', 't1')).rejects.toThrow(NotFoundException);
    });

    it('reports already-completed tasks without a new completedAt', async () => {
      repository.findTaskById.mockResolvedValue(
        task('t1', { isCompleted: true, completedAt: new Date('2026-01-01') }),
      );
      repository.completeTask.mockResolvedValue({ count: 0 });

      const result = asAny(await service.completeTask('u1', 't1'));

      expect(result.isCompleted).toBe(false);
      expect(result.completedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('getProgress', () => {
    it('computes progress and records a snapshot', async () => {
      repository.findRoadmapWeeks.mockResolvedValue([
        week(1, [task('t1', { isCompleted: true }), task('t2', { isCompleted: true }), task('t3')]),
      ]);

      const result = asAny(await service.getProgress('u1'));

      expect(result.overallPercent).toBe(67);
      expect(repository.upsertProgressRecord).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ totalTasks: 3, completed: 2, percent: 67 }),
      );
    });
  });

  describe('getCompanyPrep', () => {
    it('returns the company track when found', async () => {
      repository.findCompanyTrack.mockResolvedValue({
        id: 'c1',
        company: 'Google',
        description: 'Google prep',
        focusAreas: ['DSA', 'System Design'],
        resources: null,
      });
      const result = asAny(await service.getCompanyPrep('Google'));
      expect(result.company).toBe('Google');
    });

    it('throws 404 for an unknown company', async () => {
      repository.findCompanyTrack.mockResolvedValue(null);
      await expect(service.getCompanyPrep('Nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReadinessPrediction', () => {
    it('computes a prediction from the existing 5.2 readiness score + progress', async () => {
      repository.findReadinessScore.mockResolvedValue({ overall: 80 });
      repository.findRoadmapWeeks.mockResolvedValue([
        week(1, [
          task('t1', { isCompleted: true }),
          task('t2', { isCompleted: true }),
          task('t3', { isCompleted: true }),
          task('t4', { isCompleted: true }),
          task('t5', { isCompleted: true }),
          task('t6', { isCompleted: true }),
          task('t7', { isCompleted: true }),
        ]),
      ]);
      repository.listCareerGoals.mockResolvedValue([
        { id: 'g1', status: 'active', targetCompanies: ['Google', 'Amazon'] },
      ]);
      repository.upsertReadinessPrediction.mockResolvedValue({ id: 'p1' });

      const result = asAny(await service.getReadinessPrediction('u1'));

      expect(result.readinessScore).toBe(80);
      expect(result.predictedLevel).toBe('high');
      expect(result.monthsToReady).toBe(1);
      expect(repository.upsertReadinessPrediction).toHaveBeenCalled();
    });

    it('falls back to 0 readiness when no 5.2 score exists', async () => {
      repository.findReadinessScore.mockResolvedValue(null);
      repository.findRoadmapWeeks.mockResolvedValue([]);
      repository.listCareerGoals.mockResolvedValue([]);
      repository.upsertReadinessPrediction.mockResolvedValue({ id: 'p1' });

      const result = asAny(await service.getReadinessPrediction('u1'));

      expect(result.readinessScore).toBe(0);
      expect(result.reasons).toContain('no target companies defined');
    });
  });

  describe('getDailyChallenge', () => {
    it('returns the persisted challenge for today when one exists', async () => {
      repository.findDailyChallenge.mockResolvedValue({
        id: 'dc1',
        date: new Date(),
        title: 'Daily DSA Drill',
        description: 'desc',
        taskType: 'dsa',
        reference: null,
      });
      const result = asAny(await service.getDailyChallenge());
      expect(result.id).toBe('dc1');
      expect(repository.createDailyChallenge).not.toHaveBeenCalled();
    });

    it('creates a default challenge when none exists for today', async () => {
      repository.findDailyChallenge.mockResolvedValue(null);
      repository.createDailyChallenge.mockResolvedValue({
        id: 'dc2',
        date: new Date(),
        title: 'Daily DSA Drill',
        description: 'desc',
        taskType: 'dsa',
        reference: 'daily-challenge',
      });
      const result = asAny(await service.getDailyChallenge());
      expect(result.id).toBe('dc2');
      expect(repository.createDailyChallenge).toHaveBeenCalled();
    });
  });

  describe('generateStudyPlan', () => {
    it('uses the AI service and persists the generated plan', async () => {
      repository.listSkills.mockResolvedValue([]);
      repository.listCareerGoals.mockResolvedValue([]);
      ai.generateStructured.mockResolvedValue({
        title: 'SDE Prep',
        overview: 'plan',
        weeks: [{ week: 1, theme: 'DSA', goals: ['g'], activities: ['a'] }],
      });
      repository.createStudyPlan.mockResolvedValue({
        id: 'sp1',
        title: 'SDE Prep',
        plan: {},
        createdAt: new Date('2026-01-01'),
      });

      const result = asAny(await service.generateStudyPlan('u1', { targetRole: 'SDE' }));

      expect(result.id).toBe('sp1');
      expect(ai.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('wraps AI failures in a clean typed error', async () => {
      repository.listSkills.mockResolvedValue([]);
      repository.listCareerGoals.mockResolvedValue([]);
      const { AiServiceError } = await import('../ai/ai.service');
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom', 'AI_MALFORMED_RESPONSE'));

      await expect(service.generateStudyPlan('u1', { targetRole: 'SDE' })).rejects.toThrow(
        AiServiceError,
      );
    });
  });
});
