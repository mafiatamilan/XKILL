/**
 * Pure live analytics for a DSA student, computed directly from Submission
 * rows. Includes accuracy/acceptance-rate, a GitHub-style submission heatmap,
 * weak/strong topic classification and a rating-trend placeholder that stays
 * "not yet available" until contests ship in module 5.5c.
 */

import { MONTHLY_WINDOW_MONTHS } from './progress.calculator';

export const ACCEPTED = 'accepted';
export const WRONG_ANSWER = 'wrong_answer';

export const HEATMAP_DAYS = 90;
export const WEEKS_WINDOW = 12;
export const STRONG_MIN_SOLVED = 2;
export const STRONG_ACCEPTANCE_THRESHOLD = 0.6;
export const WEAK_MIN_ATTEMPTS = 2;
export const WEAK_ACCEPTANCE_THRESHOLD = 0.4;

export interface AnalyticsSubmissionInput {
  verdict: string | null;
  timeMs: number | null;
  problemId: string;
  topics: string[];
  submittedAt: Date;
}

export interface AnalyticsInput {
  submissions: AnalyticsSubmissionInput[];
  now?: Date;
}

export interface TopicPerformance {
  topic: string;
  attempted: number;
  solved: number;
  acceptance: number; // 0-100, rounded to 2dp
}

export interface HeatmapBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface WeekBucket {
  weekStart: string; // YYYY-MM-DD (Monday)
  submissions: number;
  solved: number;
}

export interface MonthBucket {
  month: string; // YYYY-MM
  submissions: number;
  solved: number;
}

export interface AnalyticsResult {
  totalSubmissions: number;
  solvedProblems: number;
  attemptedProblems: number;
  accuracy: number | null; // accepted / completed submissions, %
  acceptanceRate: number | null; // accepted / (accepted + wrong_answer), %
  averageRuntimeMs: number | null;
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  heatmap: HeatmapBucket[];
  weeklyProgress: WeekBucket[];
  monthlyProgress: MonthBucket[];
  ratingTrend: {
    available: false;
    message: string;
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

/** Monday of the ISO week containing the given date. */
function startOfIsoWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = (day.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function byTopic(submissions: AnalyticsSubmissionInput[]): Map<string, TopicPerformance> {
  const grouped = new Map<string, { attempted: Set<string>; solved: Set<string> }>();
  for (const submission of submissions) {
    const isAccepted = submission.verdict === ACCEPTED;
    for (const topic of submission.topics) {
      const bucket = grouped.get(topic) ?? { attempted: new Set(), solved: new Set() };
      bucket.attempted.add(submission.problemId);
      if (isAccepted) {
        bucket.solved.add(submission.problemId);
      }
      grouped.set(topic, bucket);
    }
  }
  const result = new Map<string, TopicPerformance>();
  for (const [topic, bucket] of grouped) {
    const attempted = bucket.attempted.size;
    const solved = bucket.solved.size;
    result.set(topic, {
      topic,
      attempted,
      solved,
      acceptance: attempted === 0 ? 0 : round((solved / attempted) * 100, 2),
    });
  }
  return result;
}

export function computeAnalytics(input: AnalyticsInput): AnalyticsResult {
  const now = startOfUtcDay(input.now ?? new Date());
  const submissions = input.submissions;

  const completed = submissions.filter((s) => s.verdict !== null);
  const accepted = submissions.filter((s) => s.verdict === ACCEPTED);
  const wrongAnswer = submissions.filter((s) => s.verdict === WRONG_ANSWER);

  const correctnessVerdicts = accepted.length + wrongAnswer.length;
  const accuracy =
    completed.length === 0 ? null : round((accepted.length / completed.length) * 100, 2);
  const acceptanceRate =
    correctnessVerdicts === 0 ? null : round((accepted.length / correctnessVerdicts) * 100, 2);

  const acceptedRuntimes = accepted
    .map((s) => s.timeMs)
    .filter((timeMs): timeMs is number => typeof timeMs === 'number');
  const averageRuntimeMs =
    acceptedRuntimes.length === 0
      ? null
      : round(acceptedRuntimes.reduce((a, b) => a + b, 0) / acceptedRuntimes.length, 2);

  const solvedProblemIds = new Set(accepted.map((s) => s.problemId));
  const attemptedProblemIds = new Set(submissions.map((s) => s.problemId));

  const topics = [...byTopic(submissions).values()].sort((a, b) => a.topic.localeCompare(b.topic));
  const strongTopics = topics
    .filter(
      (t) => t.solved >= STRONG_MIN_SOLVED && t.acceptance / 100 >= STRONG_ACCEPTANCE_THRESHOLD,
    )
    .sort((a, b) => b.solved - a.solved || a.topic.localeCompare(b.topic));
  const weakTopics = topics
    .filter(
      (t) => t.attempted >= WEAK_MIN_ATTEMPTS && t.acceptance / 100 < WEAK_ACCEPTANCE_THRESHOLD,
    )
    .sort((a, b) => a.acceptance - b.acceptance || a.topic.localeCompare(b.topic));

  const heatmapBuckets = new Map<string, number>();
  const weekBuckets = new Map<string, { submissions: number; solved: number }>();
  const monthBuckets = new Map<string, { submissions: number; solved: number }>();

  const currentWeek = startOfIsoWeek(now);
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const weekWindowStart = addWeeks(currentWeek, -(WEEKS_WINDOW - 1));
  const monthWindowStart = addMonths(currentMonth, -(MONTHLY_WINDOW_MONTHS - 1));

  for (const submission of submissions) {
    if (submission.verdict === null) {
      continue;
    }
    const day = startOfUtcDay(submission.submittedAt);
    const isAccepted = submission.verdict === ACCEPTED;

    if (day <= now && day > addDays(now, -HEATMAP_DAYS)) {
      const dateKey = toDateKey(day);
      heatmapBuckets.set(dateKey, (heatmapBuckets.get(dateKey) ?? 0) + 1);
    }

    const weekStart = startOfIsoWeek(day);
    if (weekStart >= weekWindowStart && weekStart <= currentWeek) {
      const weekKey = toDateKey(weekStart);
      const weekBucket = weekBuckets.get(weekKey) ?? { submissions: 0, solved: 0 };
      weekBucket.submissions += 1;
      if (isAccepted) {
        weekBucket.solved += 1;
      }
      weekBuckets.set(weekKey, weekBucket);
    }

    const monthStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
    if (monthStart >= monthWindowStart && monthStart <= currentMonth) {
      const monthKey = toMonthKey(monthStart);
      const monthBucket = monthBuckets.get(monthKey) ?? { submissions: 0, solved: 0 };
      monthBucket.submissions += 1;
      if (isAccepted) {
        monthBucket.solved += 1;
      }
      monthBuckets.set(monthKey, monthBucket);
    }
  }

  const heatmap: HeatmapBucket[] = [];
  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(now, -offset);
    heatmap.push({ date: toDateKey(day), count: heatmapBuckets.get(toDateKey(day)) ?? 0 });
  }

  const weeklyProgress: WeekBucket[] = [];
  for (let offset = WEEKS_WINDOW - 1; offset >= 0; offset -= 1) {
    const weekStart = addWeeks(currentWeek, -offset);
    const key = toDateKey(weekStart);
    const bucket = weekBuckets.get(key) ?? { submissions: 0, solved: 0 };
    weeklyProgress.push({ weekStart: key, ...bucket });
  }

  const monthlyProgress: MonthBucket[] = [];
  for (let offset = MONTHLY_WINDOW_MONTHS - 1; offset >= 0; offset -= 1) {
    const month = addMonths(currentMonth, -offset);
    const key = toMonthKey(month);
    const bucket = monthBuckets.get(key) ?? { submissions: 0, solved: 0 };
    monthlyProgress.push({ month: key, ...bucket });
  }

  return {
    totalSubmissions: submissions.length,
    solvedProblems: solvedProblemIds.size,
    attemptedProblems: attemptedProblemIds.size,
    accuracy,
    acceptanceRate,
    averageRuntimeMs,
    weakTopics,
    strongTopics,
    heatmap,
    weeklyProgress,
    monthlyProgress,
    ratingTrend: {
      available: false,
      message:
        'Rating trend is not yet available — it requires contest history which ships in module 5.5c',
    },
  };
}
