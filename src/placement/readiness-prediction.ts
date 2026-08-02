/**
 * Placement readiness prediction.
 *
 * DECISION: this extends the 5.2 `ReadinessScore` rather than building a second
 * parallel scoring system. `calculateReadinessScore` (5.2) remains the single
 * source of truth for the base score; this layer adds placement-specific inputs
 * (roadmap progress, target-company count) on top and maps the composite to a
 * predicted level + months-to-placement-ready. Pure function, unit-tested with
 * fixed input/expected-output pairs.
 */

export interface PlacementPredictionInput {
  /** Base readiness overall score (0-100) from the 5.2 ReadinessScore. */
  readinessScore: number;
  /** Overall roadmap completion percentage (0-100). */
  progressPercent: number;
  /** Number of active target companies the student is preparing for. */
  targetCompanyCount: number;
}

export type PredictedLevel = 'high' | 'medium' | 'low';

export interface PlacementPredictionResult {
  predictedLevel: PredictedLevel;
  monthsToReady: number;
  /** Composite placement score (0-100) that drove the level. */
  compositeScore: number;
  reasons: string[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Composite = 70% base readiness + 30% roadmap progress, then a small bonus for
 * having concrete target companies (preparing for nothing = lower signal).
 */
export function calculatePlacementPrediction(
  input: PlacementPredictionInput,
): PlacementPredictionResult {
  const progress = clamp(input.progressPercent, 0, 100);
  const base = clamp(input.readinessScore, 0, 100);

  let composite = Math.round(base * 0.7 + progress * 0.3);
  if (input.targetCompanyCount === 0) {
    composite = Math.round(composite * 0.9);
  }

  let predictedLevel: PredictedLevel;
  if (composite >= 75) {
    predictedLevel = 'high';
  } else if (composite >= 50) {
    predictedLevel = 'medium';
  } else {
    predictedLevel = 'low';
  }

  const reasons: string[] = [];
  if (base >= 75) reasons.push('strong readiness score');
  else if (base < 40) reasons.push('readiness score needs work');
  if (progress >= 75) reasons.push('roadmap nearly complete');
  else if (progress < 40) reasons.push('roadmap progress is low');
  if (input.targetCompanyCount === 0) {
    reasons.push('no target companies defined');
  }

  return {
    predictedLevel,
    monthsToReady: predictedLevel === 'high' ? 1 : predictedLevel === 'medium' ? 3 : 6,
    compositeScore: composite,
    reasons,
  };
}
