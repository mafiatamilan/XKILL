import {
  DAILY_WINDOW_DAYS,
  MONTHLY_WINDOW_MONTHS,
  computeProgress,
  ProgressInput,
} from './progress.calculator';

const NOW = new Date('2026-07-31T12:00:00Z');

function problem(
  overrides: Partial<{
    difficulty: string;
    topics: string[];
    companies: string[];
    firstSolvedAt: Date;
  }>,
) {
  return {
    difficulty: 'easy',
    topics: ['array'],
    companies: ['Google'],
    firstSolvedAt: NOW,
    ...overrides,
  };
}

function input(solvedProblems: ReturnType<typeof problem>[]): ProgressInput {
  return { solvedProblems, now: NOW };
}

describe('computeProgress', () => {
  it('counts total solved and difficulty breakdown', () => {
    const result = computeProgress(
      input([
        problem({ difficulty: 'easy' }),
        problem({ difficulty: 'easy' }),
        problem({ difficulty: 'medium' }),
        problem({ difficulty: 'hard' }),
      ]),
    );
    expect(result.totalSolved).toBe(4);
    expect(result.byDifficulty).toEqual({ easy: 2, medium: 1, hard: 1 });
  });

  it('aggregates topics and companies sorted by solved count desc', () => {
    const result = computeProgress(
      input([
        problem({ topics: ['array', 'hash-map'], companies: ['Google'] }),
        problem({ topics: ['array', 'hash-map'], companies: ['Google'] }),
        problem({ topics: ['array'], companies: ['Amazon'] }),
        problem({ topics: ['dp'], companies: ['Microsoft'] }),
      ]),
    );
    expect(result.byTopic).toEqual([
      { name: 'array', solved: 3 },
      { name: 'hash-map', solved: 2 },
      { name: 'dp', solved: 1 },
    ]);
    expect(result.byCompany).toEqual([
      { name: 'Google', solved: 2 },
      { name: 'Amazon', solved: 1 },
      { name: 'Microsoft', solved: 1 },
    ]);
  });

  it('returns an empty zeroed result when nothing is solved', () => {
    const result = computeProgress(input([]));
    expect(result.totalSolved).toBe(0);
    expect(result.byDifficulty).toEqual({ easy: 0, medium: 0, hard: 0 });
    expect(result.byTopic).toEqual([]);
    expect(result.daily).toHaveLength(DAILY_WINDOW_DAYS);
    expect(result.daily.every((b) => b.solved === 0)).toBe(true);
    expect(result.monthly).toHaveLength(MONTHLY_WINDOW_MONTHS);
  });

  it('buckets solves into the daily window only for in-window days', () => {
    const result = computeProgress(
      input([
        problem({ firstSolvedAt: new Date('2026-07-31T08:00:00Z') }), // in window
        problem({ firstSolvedAt: new Date('2026-07-15T08:00:00Z') }), // in window
        problem({ firstSolvedAt: new Date('2026-05-01T08:00:00Z') }), // out of window
      ]),
    );
    expect(result.daily).toHaveLength(DAILY_WINDOW_DAYS);
    expect(result.daily.at(-1)).toEqual({ date: '2026-07-31', solved: 1 });
    expect(result.daily.find((b) => b.date === '2026-07-15')?.solved).toBe(1);
    expect(result.daily.find((b) => b.date === '2026-05-01')).toBeUndefined();
  });

  it('buckets solves into the monthly window covering the last 6 calendar months', () => {
    const result = computeProgress(
      input([
        problem({ firstSolvedAt: new Date('2026-07-10T08:00:00Z') }), // July (current)
        problem({ firstSolvedAt: new Date('2026-06-10T08:00:00Z') }), // June (in window)
        problem({ firstSolvedAt: new Date('2026-01-10T08:00:00Z') }), // Jan (out of 6-month window)
      ]),
    );
    expect(result.monthly).toHaveLength(MONTHLY_WINDOW_MONTHS);
    expect(result.monthly.at(-1)).toEqual({ month: '2026-07', solved: 1 });
    expect(result.monthly.find((b) => b.month === '2026-06')?.solved).toBe(1);
    expect(result.monthly.find((b) => b.month === '2026-01')).toBeUndefined();
  });

  it('ignores unknown difficulties rather than crashing', () => {
    const result = computeProgress(input([problem({ difficulty: 'impossible' })]));
    expect(result.totalSolved).toBe(1);
    expect(result.byDifficulty).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});
