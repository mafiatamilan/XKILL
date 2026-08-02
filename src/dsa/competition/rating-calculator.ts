/**
 * Pure Elo-style rating update for DSA contests, documented in PROGRESS.md.
 *
 * E = (1/(N-1)) * Σ_j 1/(1+10^((r_j - R)/400))  — expected fraction beaten
 * S = (N - rank)/(N - 1)                         — actual fraction beaten
 * Δ = round(K * (S - E))                          — K = 40 for first 10 rated
 *                                                    contests, 20 afterwards
 * New rating clamped to [100, 4000]; initial rating 1200.
 */

export const INITIAL_RATING = 1200;
export const MIN_RATING = 100;
export const MAX_RATING = 4000;
export const PROVISIONAL_CONTESTS = 10;
export const PROVISIONAL_K = 40;
export const STANDARD_K = 20;

// Composite-score packing bound: must exceed the largest possible elapsed
// seconds between contest start and a submission landing (~115 days at 1e7).
export const COMPOSITE_SECONDS_BASE = 10_000_000;

export interface RatingUpdateInput {
  currentRating: number;
  /** Number of rated contests completed before this one. */
  contestsParticipated: number;
  /** 1-based finishing position (1 = winner). */
  userRank: number;
  /** Ratings of every other participant in the contest. */
  opponentRatings: number[];
}

export interface RatingUpdateResult {
  delta: number;
  newRating: number;
}

export function expectedScore(currentRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - currentRating) / 400));
}

export function computeRatingUpdate(input: RatingUpdateInput): RatingUpdateResult {
  const participantCount = input.opponentRatings.length + 1;
  if (participantCount < 2) {
    return { delta: 0, newRating: input.currentRating };
  }

  let expected = 0;
  for (const rating of input.opponentRatings) {
    expected += expectedScore(input.currentRating, rating);
  }
  expected /= participantCount - 1;

  const actual = (participantCount - input.userRank) / (participantCount - 1);
  const k = input.contestsParticipated < PROVISIONAL_CONTESTS ? PROVISIONAL_K : STANDARD_K;
  const newRating = clamp(Math.round(input.currentRating + k * (actual - expected)));
  return { delta: newRating - input.currentRating, newRating };
}

/**
 * Single zset score encoding BOTH leaderboard dimensions so Redis ordering
 * exactly matches contest ordering with no secondary sort:
 *   higher points win; equal points -> earlier last-accepted time wins.
 * The tie-break component occupies [0, BASE-1] (BASE-1 - elapsed), so an
 * untouched participant (0 points, 0 elapsed) encodes exactly `0 * BASE`,
 * which decodes back to 0 points / 0 penalty.
 */
export function contestCompositeScore(points: number, elapsedSeconds: number): number {
  const clampedElapsed = clampElapsed(elapsedSeconds);
  return points * COMPOSITE_SECONDS_BASE + (COMPOSITE_SECONDS_BASE - 1 - clampedElapsed);
}

export function ratingTier(rating: number): string {
  if (rating < 1200) return 'Beginner';
  if (rating < 1400) return 'Amateur';
  if (rating < 1600) return 'Intermediate';
  if (rating < 1800) return 'Advanced';
  if (rating < 2000) return 'Expert';
  if (rating < 2400) return 'Master';
  if (rating < 2800) return 'Grandmaster';
  return 'Legendary';
}

function clamp(rating: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating));
}

function clampElapsed(elapsedSeconds: number): number {
  if (elapsedSeconds < 0) return 0;
  if (elapsedSeconds >= COMPOSITE_SECONDS_BASE) return COMPOSITE_SECONDS_BASE - 1;
  return elapsedSeconds;
}
