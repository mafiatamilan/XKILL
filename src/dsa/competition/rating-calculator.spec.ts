import {
  computeRatingUpdate,
  contestCompositeScore,
  expectedScore,
  ratingTier,
  INITIAL_RATING,
  MIN_RATING,
  MAX_RATING,
  COMPOSITE_SECONDS_BASE,
} from './rating-calculator';

describe('rating-calculator', () => {
  describe('expectedScore', () => {
    it('returns 0.5 for equal ratings', () => {
      expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 10);
    });

    it('favours the higher-rated player', () => {
      expect(expectedScore(1200, 1300)).toBeCloseTo(0.36, 2);
      expect(expectedScore(1200, 1100)).toBeCloseTo(0.64, 2);
    });
  });

  describe('computeRatingUpdate', () => {
    it('uses provisional K (40) for the first 10 rated contests', () => {
      // 2 players, both 1200, this player wins (rank 1):
      // E = 0.5, S = 1, Δ = 40 * 0.5 = 20
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 0,
        userRank: 1,
        opponentRatings: [1200],
      });
      expect(result.newRating).toBe(1220);
      expect(result.delta).toBe(20);
    });

    it('switches to standard K (20) after 10 rated contests', () => {
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 10,
        userRank: 1,
        opponentRatings: [1200],
      });
      expect(result.newRating).toBe(1210);
      expect(result.delta).toBe(10);
    });

    it('applies a symmetric negative delta for last place', () => {
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 3,
        userRank: 2,
        opponentRatings: [1200],
      });
      expect(result.newRating).toBe(1180);
      expect(result.delta).toBe(-20);
    });

    it('rewards beating a much stronger field', () => {
      const result = computeRatingUpdate({
        currentRating: 1000,
        contestsParticipated: 5,
        userRank: 1,
        opponentRatings: [1500, 1480, 1200],
      });
      // S = 1, E = average of expected vs each opponent (~0.05+0.057+0.24)/3 ≈ 0.116
      expect(result.delta).toBeGreaterThan(30);
      expect(result.newRating).toBe(1000 + result.delta);
    });

    it('clamps the new rating to [100, 4000]', () => {
      const winner = computeRatingUpdate({
        currentRating: 3990,
        contestsParticipated: 1,
        userRank: 1,
        opponentRatings: [3990],
      });
      expect(winner.newRating).toBe(MAX_RATING);

      const loser = computeRatingUpdate({
        currentRating: 110,
        contestsParticipated: 1,
        userRank: 2,
        opponentRatings: [110],
      });
      expect(loser.newRating).toBe(MIN_RATING);
    });

    it('returns a no-op for a solo participant', () => {
      const result = computeRatingUpdate({
        currentRating: INITIAL_RATING,
        contestsParticipated: 0,
        userRank: 1,
        opponentRatings: [],
      });
      expect(result).toEqual({ delta: 0, newRating: INITIAL_RATING });
    });
  });

  describe('contestCompositeScore', () => {
    it('orders higher points above lower points regardless of time', () => {
      const high = contestCompositeScore(200, 5000);
      const low = contestCompositeScore(100, 1);
      expect(high).toBeGreaterThan(low);
    });

    it('orders equal points by earlier last-accepted time first', () => {
      const early = contestCompositeScore(100, 120);
      const late = contestCompositeScore(100, 900);
      expect(early).toBeGreaterThan(late);
    });

    it('rejects negative elapsed seconds', () => {
      expect(contestCompositeScore(100, -5)).toBe(contestCompositeScore(100, 0));
    });

    it('caps elapsed seconds below the packing base', () => {
      const atBase = contestCompositeScore(100, COMPOSITE_SECONDS_BASE + 50);
      expect(atBase).toBe(contestCompositeScore(100, COMPOSITE_SECONDS_BASE - 1));
    });

    it('round-trips an untouched participant back to 0 points / 0 penalty', () => {
      const score = contestCompositeScore(0, 0);
      expect(Math.floor(score / COMPOSITE_SECONDS_BASE)).toBe(0);
      expect(COMPOSITE_SECONDS_BASE - 1 - (score % COMPOSITE_SECONDS_BASE)).toBe(0);
    });

    it('round-trips a solved participant back to its exact metrics', () => {
      const score = contestCompositeScore(250, 1234);
      expect(Math.floor(score / COMPOSITE_SECONDS_BASE)).toBe(250);
      expect(COMPOSITE_SECONDS_BASE - 1 - (score % COMPOSITE_SECONDS_BASE)).toBe(1234);
    });
  });

  describe('ratingTier', () => {
    it('classifies across the whole ladder', () => {
      expect(ratingTier(100)).toBe('Beginner');
      expect(ratingTier(1199)).toBe('Beginner');
      expect(ratingTier(1200)).toBe('Amateur');
      expect(ratingTier(1450)).toBe('Intermediate');
      expect(ratingTier(1700)).toBe('Advanced');
      expect(ratingTier(1950)).toBe('Expert');
      expect(ratingTier(2200)).toBe('Master');
      expect(ratingTier(2600)).toBe('Grandmaster');
      expect(ratingTier(3000)).toBe('Legendary');
    });
  });

  describe('computeRatingUpdate — battle context (1v1)', () => {
    it('winner gains rating vs same-rated opponent', () => {
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 0,
        userRank: 1,
        opponentRatings: [1200],
      });
      expect(result.delta).toBe(20);
      expect(result.newRating).toBe(1220);
    });

    it('loser loses symmetric rating vs same-rated opponent', () => {
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 0,
        userRank: 2,
        opponentRatings: [1200],
      });
      expect(result.delta).toBe(-20);
      expect(result.newRating).toBe(1180);
    });

    it('draw yields near-zero delta for equal ratings', () => {
      const result = computeRatingUpdate({
        currentRating: 1200,
        contestsParticipated: 5,
        userRank: 1.5,
        opponentRatings: [1200],
      });
      // S = (2-1.5)/(2-1) = 0.5, E = 0.5 → delta = 0
      expect(result.delta).toBe(0);
      expect(result.newRating).toBe(1200);
    });

    it('weaker player beating stronger gains more than standard', () => {
      const result = computeRatingUpdate({
        currentRating: 1000,
        contestsParticipated: 5,
        userRank: 1,
        opponentRatings: [1400],
      });
      expect(result.delta).toBeGreaterThan(30);
    });

    it('draw with unequal ratings slightly benefits weaker player', () => {
      const weak = computeRatingUpdate({
        currentRating: 1000,
        contestsParticipated: 5,
        userRank: 1.5,
        opponentRatings: [1400],
      });
      const strong = computeRatingUpdate({
        currentRating: 1400,
        contestsParticipated: 5,
        userRank: 1.5,
        opponentRatings: [1000],
      });
      // Weaker player gains, stronger player loses on a draw
      expect(weak.delta).toBeGreaterThan(0);
      expect(strong.delta).toBeLessThan(0);
    });
  });
});
