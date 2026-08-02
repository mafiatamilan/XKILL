import {
  HEATMAP_DAYS,
  WEEKS_WINDOW,
  computeAnalytics,
  AnalyticsInput,
} from './analytics.calculator';

const NOW = new Date('2026-07-31T12:00:00Z');

function submission(
  overrides: Partial<{
    verdict: string | null;
    timeMs: number | null;
    problemId: string;
    topics: string[];
    submittedAt: Date;
  }>,
) {
  return {
    verdict: 'accepted',
    timeMs: 42,
    problemId: 'p1',
    topics: ['array'],
    submittedAt: NOW,
    ...overrides,
  };
}

function input(submissions: ReturnType<typeof submission>[]): AnalyticsInput {
  return { submissions, now: NOW };
}

describe('computeAnalytics', () => {
  it('computes accuracy and acceptance rate over submissions', () => {
    const result = computeAnalytics(
      input([
        submission({ verdict: 'accepted' }),
        submission({ verdict: 'wrong_answer' }),
        submission({ verdict: 'time_limit_exceeded' }),
      ]),
    );
    expect(result.accuracy).toBe(33.33); // 1/3 completed
    expect(result.acceptanceRate).toBe(50); // 1/(1+1) correctness-only
    expect(result.totalSubmissions).toBe(3);
  });

  it('returns null accuracy/acceptance before any verdict exists', () => {
    const result = computeAnalytics(
      input([submission({ verdict: null }), submission({ verdict: null })]),
    );
    expect(result.accuracy).toBeNull();
    expect(result.acceptanceRate).toBeNull();
  });

  it('computes average runtime only over accepted submissions', () => {
    const result = computeAnalytics(
      input([
        submission({ verdict: 'accepted', timeMs: 20 }),
        submission({ verdict: 'accepted', timeMs: 40 }),
        submission({ verdict: 'wrong_answer', timeMs: 500 }),
      ]),
    );
    expect(result.averageRuntimeMs).toBe(30);
    expect(result.solvedProblems).toBe(1);
    expect(result.attemptedProblems).toBe(1);
  });

  it('returns null average runtime when no accepted submission has a runtime', () => {
    const result = computeAnalytics(input([submission({ verdict: 'accepted', timeMs: null })]));
    expect(result.averageRuntimeMs).toBeNull();
  });

  it('classifies strong topics by solved count and acceptance threshold', () => {
    const result = computeAnalytics(
      input([
        submission({ problemId: 'p1', topics: ['array'], verdict: 'accepted' }),
        submission({ problemId: 'p2', topics: ['array'], verdict: 'accepted' }),
        submission({ problemId: 'p3', topics: ['array'], verdict: 'wrong_answer' }),
      ]),
    );
    expect(result.strongTopics).toEqual([
      {
        topic: 'array',
        attempted: 3,
        solved: 2,
        acceptance: 66.67,
      },
    ]);
    expect(result.weakTopics).toEqual([]);
  });

  it('classifies weak topics by attempts and low acceptance', () => {
    const result = computeAnalytics(
      input([
        submission({ problemId: 'p1', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p2', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p3', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p4', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p5', topics: ['graphs'], verdict: 'accepted' }),
      ]),
    );
    expect(result.weakTopics).toEqual([
      {
        topic: 'graphs',
        attempted: 5,
        solved: 1,
        acceptance: 20,
      },
    ]);
    expect(result.strongTopics).toEqual([]);
  });

  it('does not flag a topic sitting exactly on the weak acceptance boundary', () => {
    const result = computeAnalytics(
      input([
        submission({ problemId: 'p1', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p2', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p3', topics: ['graphs'], verdict: 'wrong_answer' }),
        submission({ problemId: 'p4', topics: ['graphs'], verdict: 'accepted' }),
        submission({ problemId: 'p5', topics: ['graphs'], verdict: 'accepted' }),
      ]),
    );
    expect(result.weakTopics).toEqual([]);
  });

  it('does not flag a topic with too few attempts as weak', () => {
    const result = computeAnalytics(
      input([submission({ problemId: 'p1', topics: ['strings'], verdict: 'wrong_answer' })]),
    );
    expect(result.weakTopics).toEqual([]);
  });

  it('counts a problem as solved only once per distinct problem', () => {
    const result = computeAnalytics(
      input([
        submission({ problemId: 'p1', verdict: 'accepted' }),
        submission({ problemId: 'p1', verdict: 'accepted' }),
        submission({ problemId: 'p2', verdict: 'accepted' }),
      ]),
    );
    expect(result.solvedProblems).toBe(2);
    expect(result.attemptedProblems).toBe(2);
  });

  it('builds a zero-padded heatmap of exactly HEATMAP_DAYS entries', () => {
    const result = computeAnalytics(
      input([
        submission({ submittedAt: new Date('2026-07-30T08:00:00Z') }),
        submission({ submittedAt: new Date('2026-07-30T09:00:00Z') }),
      ]),
    );
    expect(result.heatmap).toHaveLength(HEATMAP_DAYS);
    expect(result.heatmap.at(-1)).toEqual({ date: '2026-07-31', count: 0 });
    expect(result.heatmap.find((b) => b.date === '2026-07-30')?.count).toBe(2);
    expect(result.heatmap.filter((b) => b.count > 0)).toHaveLength(1);
  });

  it('excludes out-of-heatmap-window activity', () => {
    const result = computeAnalytics(
      input([submission({ submittedAt: new Date('2026-01-01T08:00:00Z') })]),
    );
    expect(result.heatmap.every((b) => b.count === 0)).toBe(true);
  });

  it('builds weekly and monthly progress buckets with submissions and solves', () => {
    const result = computeAnalytics(
      input([
        submission({ submittedAt: new Date('2026-07-29T08:00:00Z'), verdict: 'accepted' }),
        submission({ submittedAt: new Date('2026-07-29T09:00:00Z'), verdict: 'wrong_answer' }),
        submission({ submittedAt: new Date('2026-03-10T08:00:00Z'), verdict: 'accepted' }),
      ]),
    );
    expect(result.weeklyProgress).toHaveLength(WEEKS_WINDOW);
    const weekStart = result.weeklyProgress.find((w) => w.submissions > 0);
    expect(weekStart).not.toBeUndefined();
    expect(weekStart!.solved).toBe(1);
    expect(result.monthlyProgress.find((m) => m.month === '2026-07')).toEqual({
      month: '2026-07',
      submissions: 2,
      solved: 1,
    });
    expect(result.monthlyProgress.find((m) => m.month === '2026-03')).toEqual({
      month: '2026-03',
      submissions: 1,
      solved: 1,
    });
  });

  it('emits the rating-trend placeholder until contests ship (5.5c)', () => {
    const result = computeAnalytics(input([]));
    expect(result.ratingTrend.available).toBe(false);
    expect(result.ratingTrend.message).toContain('5.5c');
  });
});
