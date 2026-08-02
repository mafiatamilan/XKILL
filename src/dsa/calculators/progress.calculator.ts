/**
 * Pure live progress computation for a DSA student. Everything is derived on
 * the fly from the user's SolvedProblem rows — there is deliberately no cached
 * or pre-aggregated state to go stale.
 */

export const DAILY_WINDOW_DAYS = 30;
export const MONTHLY_WINDOW_MONTHS = 6;

export interface ProgressProblemInput {
  difficulty: string;
  topics: string[];
  companies: string[];
  firstSolvedAt: Date;
}

export interface ProgressInput {
  solvedProblems: ProgressProblemInput[];
  now?: Date;
}

export interface DifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export interface NamedBucket {
  name: string;
  solved: number;
}

export interface DailyProgressBucket {
  date: string; // YYYY-MM-DD
  solved: number;
}

export interface MonthlyProgressBucket {
  month: string; // YYYY-MM
  solved: number;
}

export interface ProgressResult {
  totalSolved: number;
  byDifficulty: DifficultyBreakdown;
  byTopic: NamedBucket[];
  byCompany: NamedBucket[];
  daily: DailyProgressBucket[];
  monthly: MonthlyProgressBucket[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'UTC',
});

function toDateKey(date: Date): string {
  return DATE_FORMATTER.format(date);
}

function toMonthKey(date: Date): string {
  return MONTH_FORMATTER.format(date);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function tally(items: string[]): NamedBucket[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, solved]) => ({ name, solved }))
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name));
}

export function computeProgress(input: ProgressInput): ProgressResult {
  const now = startOfUtcDay(input.now ?? new Date());
  const solvedProblems = input.solvedProblems;

  const byDifficulty: DifficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
  const topicItems: string[] = [];
  const companyItems: string[] = [];
  const dailyBuckets = new Map<string, number>();
  const monthlyBuckets = new Map<string, number>();

  for (const problem of solvedProblems) {
    const difficulty = problem.difficulty.toLowerCase();
    if (difficulty in byDifficulty) {
      byDifficulty[difficulty as keyof DifficultyBreakdown] += 1;
    }
    for (const topic of problem.topics) topicItems.push(topic);
    for (const company of problem.companies) companyItems.push(company);

    const solvedDay = startOfUtcDay(problem.firstSolvedAt);
    if (solvedDay <= now && solvedDay > addDays(now, -DAILY_WINDOW_DAYS)) {
      dailyBuckets.set(toDateKey(solvedDay), (dailyBuckets.get(toDateKey(solvedDay)) ?? 0) + 1);
    }
    const solvedMonth = new Date(Date.UTC(solvedDay.getUTCFullYear(), solvedDay.getUTCMonth(), 1));
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (
      solvedMonth >= addMonths(currentMonthStart, -(MONTHLY_WINDOW_MONTHS - 1)) &&
      solvedMonth <= currentMonthStart
    ) {
      monthlyBuckets.set(
        toMonthKey(solvedMonth),
        (monthlyBuckets.get(toMonthKey(solvedMonth)) ?? 0) + 1,
      );
    }
  }

  const daily: DailyProgressBucket[] = [];
  for (let offset = DAILY_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(now, -offset);
    daily.push({ date: toDateKey(day), solved: dailyBuckets.get(toDateKey(day)) ?? 0 });
  }

  const monthly: MonthlyProgressBucket[] = [];
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let offset = MONTHLY_WINDOW_MONTHS - 1; offset >= 0; offset -= 1) {
    const month = addMonths(currentMonth, -offset);
    monthly.push({ month: toMonthKey(month), solved: monthlyBuckets.get(toMonthKey(month)) ?? 0 });
  }

  return {
    totalSolved: solvedProblems.length,
    byDifficulty,
    byTopic: tally(topicItems),
    byCompany: tally(companyItems),
    daily,
    monthly,
  };
}
