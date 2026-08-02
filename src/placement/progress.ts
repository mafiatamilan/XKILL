/**
 * Pure progress calculation for the placement roadmap. Given the per-week task
 * tallies, returns overall completion percentage (0-100, rounded) plus the
 * per-week breakdown. No I/O, unit-testable with fixed input/expected pairs.
 */

export interface WeekProgressInput {
  weekNumber: number;
  total: number;
  completed: number;
}

export interface ProgressResult {
  overallPercent: number;
  totalTasks: number;
  completedTasks: number;
  weeks: Array<{ weekNumber: number; percent: number; total: number; completed: number }>;
}

export function calculateProgress(weeks: WeekProgressInput[]): ProgressResult {
  const totalTasks = weeks.reduce((sum, week) => sum + week.total, 0);
  const completedTasks = weeks.reduce((sum, week) => sum + week.completed, 0);
  const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    overallPercent,
    totalTasks,
    completedTasks,
    weeks: weeks.map((week) => ({
      weekNumber: week.weekNumber,
      total: week.total,
      completed: week.completed,
      percent: week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0,
    })),
  };
}

/** Single-week completion percentage helper. */
export function weekPercent(total: number, completed: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
