/**
 * Pure per-participant contest standing. A participant's score is the sum of
 * points earned across their solves; the tie-break value is the elapsed
 * seconds (since contest start) of their LAST accepted submission — earlier
 * is better. Both feed `contestCompositeScore` for the live leaderboard.
 */

export interface ContestSolveMetricInput {
  maxPointsEarned: number;
  firstAcceptedAt: Date | null;
}

export interface ContestMetricsResult {
  score: number;
  penaltySeconds: number;
}

export function contestMetrics(
  solves: ContestSolveMetricInput[],
  startTime: Date,
): ContestMetricsResult {
  let score = 0;
  let lastAccepted = 0;
  for (const solve of solves) {
    score += solve.maxPointsEarned;
    if (solve.firstAcceptedAt) {
      const elapsed = Math.max(
        0,
        Math.floor((solve.firstAcceptedAt.getTime() - startTime.getTime()) / 1000),
      );
      if (elapsed > lastAccepted) {
        lastAccepted = elapsed;
      }
    }
  }
  return { score, penaltySeconds: lastAccepted };
}

/** Competition-style ranking: equal (score, penalty) rows share a rank. */
export function assignCompetitionRanks<T extends { score: number; penaltySeconds: number }>(
  rows: T[],
): Array<T & { rank: number }> {
  const ranked: Array<T & { rank: number }> = [];
  let rank = 0;
  let previousScore = NaN;
  let previousPenalty = NaN;
  for (const row of rows) {
    if (row.score !== previousScore || row.penaltySeconds !== previousPenalty) {
      rank = ranked.length + 1;
    }
    previousScore = row.score;
    previousPenalty = row.penaltySeconds;
    ranked.push({ ...row, rank });
  }
  return ranked;
}
