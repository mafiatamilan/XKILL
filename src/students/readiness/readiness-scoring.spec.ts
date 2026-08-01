import { calculateReadinessScore, READINESS_WEIGHTS, ReadinessInput } from './readiness-scoring';

const completeInput = (): ReadinessInput => ({
  profile: { exists: true, completionPercent: 100, hasResume: true },
  skills: { total: 8, advanced: 5, categories: 4 },
  careerGoal: {
    hasGoal: true,
    hasTargetRole: true,
    hasTargetCompanies: true,
    hasTargetDate: true,
    hasCtc: true,
  },
  activity: { recentActivityCount: 6, readNotificationCount: 10 },
});

describe('calculateReadinessScore', () => {
  it('weights sum to 100', () => {
    const sum =
      READINESS_WEIGHTS.profile +
      READINESS_WEIGHTS.skills +
      READINESS_WEIGHTS.careerGoal +
      READINESS_WEIGHTS.activity;
    expect(sum).toBe(100);
  });

  it('scores a fully built profile at 100/100', () => {
    const result = calculateReadinessScore(completeInput());
    expect(result.overall).toBe(100);
    expect(result.components).toEqual({
      profile: 100,
      skills: 100,
      careerGoal: 100,
      activity: 100,
    });
  });

  it('scores an empty profile at 0/100', () => {
    const result = calculateReadinessScore({
      profile: { exists: false, completionPercent: 0, hasResume: false },
      skills: { total: 0, advanced: 0, categories: 0 },
      careerGoal: {
        hasGoal: false,
        hasTargetRole: false,
        hasTargetCompanies: false,
        hasTargetDate: false,
        hasCtc: false,
      },
      activity: { recentActivityCount: 0, readNotificationCount: 0 },
    });
    expect(result.overall).toBe(0);
    expect(result.components).toEqual({ profile: 0, skills: 0, careerGoal: 0, activity: 0 });
  });

  it('computes the profile component: exists + completion + resume', () => {
    const base = completeInput();
    const partial = calculateReadinessScore({
      ...base,
      profile: { exists: true, completionPercent: 50, hasResume: true },
    });
    expect(partial.components.profile).toBe(10 + 50 + 40);
  });

  it('caps completion and counts at their maxima', () => {
    const result = calculateReadinessScore({
      ...completeInput(),
      profile: { exists: true, completionPercent: 200, hasResume: true },
      skills: { total: 100, advanced: 100, categories: 100 },
    });
    expect(result.components.profile).toBe(100);
    expect(result.components.skills).toBe(100);
  });

  it('distinguishes skills by count, advanced level, and category coverage', () => {
    const base = completeInput();
    const onlyCount = calculateReadinessScore({
      ...base,
      skills: { total: 4, advanced: 0, categories: 1 },
    });
    expect(onlyCount.components.skills).toBe(4 * 5 + 0 + 1 * 5);

    const withAdvanced = calculateReadinessScore({
      ...base,
      skills: { total: 8, advanced: 5, categories: 4 },
    });
    expect(withAdvanced.components.skills).toBe(40 + 40 + 20);
  });

  it('builds the career-goal component from all five signals', () => {
    const base = completeInput();
    const bare = calculateReadinessScore({
      ...base,
      careerGoal: {
        hasGoal: true,
        hasTargetRole: false,
        hasTargetCompanies: false,
        hasTargetDate: false,
        hasCtc: false,
      },
    });
    expect(bare.components.careerGoal).toBe(30);

    const full = calculateReadinessScore(completeInput());
    expect(full.components.careerGoal).toBe(30 + 20 + 20 + 15 + 15);
  });

  it('weights the activity component on recent engagement', () => {
    const base = completeInput();
    const busy = calculateReadinessScore({
      ...base,
      activity: { recentActivityCount: 3, readNotificationCount: 5 },
    });
    expect(busy.components.activity).toBe(3 * 10 + 5 * 4);
  });

  it('is deterministic for the same input', () => {
    const a = calculateReadinessScore(completeInput());
    const b = calculateReadinessScore(completeInput());
    expect(a).toEqual(b);
  });

  it('produces a weighted overall that is stable across component mixes', () => {
    const balanced = calculateReadinessScore({
      profile: { exists: true, completionPercent: 100, hasResume: true },
      skills: { total: 8, advanced: 5, categories: 4 },
      careerGoal: {
        hasGoal: true,
        hasTargetRole: true,
        hasTargetCompanies: true,
        hasTargetDate: true,
        hasCtc: true,
      },
      activity: { recentActivityCount: 6, readNotificationCount: 10 },
    });
    expect(balanced.overall).toBe(Math.round((100 * 30 + 100 * 30 + 100 * 25 + 100 * 15) / 100));
    expect(balanced.overall).toBe(100);
  });
});
