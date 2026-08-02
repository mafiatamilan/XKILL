import { generateRoadmap, generateRevisionTaskType, RoadmapInput } from './roadmap-generator';
import { calculateProgress, weekPercent, WeekProgressInput } from './progress';
import { calculatePlacementPrediction, PlacementPredictionInput } from './readiness-prediction';

describe('roadmap-generator', () => {
  const baseInput = (overrides: Partial<RoadmapInput> = {}): RoadmapInput => ({
    targetRole: 'Software Engineer',
    targetCompanies: ['Google'],
    skills: [{ name: 'JavaScript', category: 'programming', proficiencyLevel: 'intermediate' }],
    ...overrides,
  });

  it('always returns exactly 10 weeks with 7 daily tasks each', () => {
    const roadmap = generateRoadmap(baseInput());
    expect(roadmap).toHaveLength(10);
    for (const week of roadmap) {
      expect(week.tasks).toHaveLength(7);
      expect(week.weekNumber).toBeGreaterThan(0);
      expect(week.tasks[0].day).toBe(1);
      expect(week.tasks[6].day).toBe(7);
    }
  });

  it('personalizes company weeks with the target company reference', () => {
    const roadmap = generateRoadmap(baseInput());
    const companyWeeks = roadmap.filter((week) => week.tasks.some((t) => t.taskType === 'company'));
    expect(companyWeeks).toHaveLength(2);
    for (const week of companyWeeks) {
      for (const task of week.tasks) {
        expect(task.reference).toBe('Google');
      }
    }
  });

  it('adds a foundations emphasis when the student lacks advanced skills', () => {
    const roadmap = generateRoadmap(
      baseInput({
        skills: [{ name: 'Java', category: 'programming', proficiencyLevel: 'beginner' }],
      }),
    );
    expect(roadmap[0].title).toContain('Foundations');
    expect(roadmap[0].focus).toContain('build core skills first');
  });

  it('skips the foundations emphasis when the student has advanced skills', () => {
    const roadmap = generateRoadmap(
      baseInput({
        skills: [{ name: 'Java', category: 'programming', proficiencyLevel: 'advanced' }],
      }),
    );
    expect(roadmap[0].focus).not.toContain('build core skills first');
  });

  it('switches the core track for a data role', () => {
    const roadmap = generateRoadmap(baseInput({ targetRole: 'Data Scientist' }));
    const core = roadmap.slice(1, 4);
    expect(core.some((week) => week.title.includes('Data'))).toBe(true);
  });

  it('defaults to software track when no target role is given', () => {
    const roadmap = generateRoadmap(baseInput({ targetRole: null }));
    expect(roadmap[1].title).toBe('DSA Core I');
  });

  it('uses a generic company reference when no target company is set', () => {
    const roadmap = generateRoadmap(baseInput({ targetCompanies: [] }));
    const companyWeek = roadmap.find((week) => week.tasks.some((t) => t.taskType === 'company'));
    expect(companyWeek?.tasks[0].reference).toBe('generic');
  });
});

describe('generateRevisionTaskType', () => {
  it('returns dsa for software roles', () => {
    expect(generateRevisionTaskType('Software Engineer')).toBe('dsa');
  });
  it('returns aptitude for data roles', () => {
    expect(generateRevisionTaskType('Data Analyst')).toBe('aptitude');
  });
  it('defaults to dsa when role is unknown', () => {
    expect(generateRevisionTaskType(null)).toBe('dsa');
  });
});

describe('calculateProgress', () => {
  it('computes overall and per-week percentages', () => {
    const weeks: WeekProgressInput[] = [
      { weekNumber: 1, total: 7, completed: 7 },
      { weekNumber: 2, total: 7, completed: 3 },
    ];
    const result = calculateProgress(weeks);
    expect(result.totalTasks).toBe(14);
    expect(result.completedTasks).toBe(10);
    expect(result.overallPercent).toBe(71);
    expect(result.weeks[0].percent).toBe(100);
    expect(result.weeks[1].percent).toBe(43);
  });

  it('returns 0 percent for an empty roadmap', () => {
    const result = calculateProgress([]);
    expect(result.overallPercent).toBe(0);
    expect(result.totalTasks).toBe(0);
  });

  it('handles a week with zero tasks without dividing by zero', () => {
    expect(weekPercent(0, 0)).toBe(0);
  });
});

describe('calculatePlacementPrediction', () => {
  const input = (overrides: Partial<PlacementPredictionInput> = {}): PlacementPredictionInput => ({
    readinessScore: 80,
    progressPercent: 90,
    targetCompanyCount: 2,
    ...overrides,
  });

  it('predicts high readiness for strong scores + progress', () => {
    const result = calculatePlacementPrediction(input());
    expect(result.predictedLevel).toBe('high');
    expect(result.monthsToReady).toBe(1);
    expect(result.compositeScore).toBeGreaterThanOrEqual(75);
  });

  it('predicts medium readiness for a mid composite', () => {
    const result = calculatePlacementPrediction(input({ readinessScore: 60, progressPercent: 40 }));
    expect(result.predictedLevel).toBe('medium');
    expect(result.monthsToReady).toBe(3);
  });

  it('predicts low readiness for weak inputs', () => {
    const result = calculatePlacementPrediction(input({ readinessScore: 20, progressPercent: 10 }));
    expect(result.predictedLevel).toBe('low');
    expect(result.monthsToReady).toBe(6);
  });

  it('penalizes a student with no target companies', () => {
    const withCompanies = calculatePlacementPrediction(input({ targetCompanyCount: 2 }));
    const withoutCompanies = calculatePlacementPrediction(input({ targetCompanyCount: 0 }));
    expect(withoutCompanies.compositeScore).toBeLessThan(withCompanies.compositeScore);
    expect(withoutCompanies.reasons).toContain('no target companies defined');
  });

  it('clamps out-of-range inputs', () => {
    const result = calculatePlacementPrediction(
      input({ readinessScore: 200, progressPercent: -10 }),
    );
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
  });
});
