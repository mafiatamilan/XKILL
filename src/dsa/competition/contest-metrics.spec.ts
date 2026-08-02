import { contestMetrics, assignCompetitionRanks } from './contest-metrics';

const at = (seconds: number) => new Date(seconds * 1000);

describe('contest-metrics', () => {
  describe('contestMetrics', () => {
    it('sums points earned and tracks the latest accepted elapsed time', () => {
      const start = at(0);
      const result = contestMetrics(
        [
          { maxPointsEarned: 100, firstAcceptedAt: at(600) },
          { maxPointsEarned: 80, firstAcceptedAt: at(1800) },
          { maxPointsEarned: 0, firstAcceptedAt: null },
        ],
        start,
      );
      expect(result.score).toBe(180);
      expect(result.penaltySeconds).toBe(1800);
    });

    it('returns zero metrics when nothing was solved', () => {
      expect(contestMetrics([{ maxPointsEarned: 0, firstAcceptedAt: null }], at(0))).toEqual({
        score: 0,
        penaltySeconds: 0,
      });
    });

    it('never produces a negative elapsed time', () => {
      const result = contestMetrics([{ maxPointsEarned: 100, firstAcceptedAt: at(5) }], at(10));
      expect(result.penaltySeconds).toBe(0);
    });
  });

  describe('assignCompetitionRanks', () => {
    it('assigns competition-style ranks, sharing ranks on ties', () => {
      const ranked = assignCompetitionRanks([
        { id: 'a', score: 300, penaltySeconds: 100 },
        { id: 'b', score: 300, penaltySeconds: 100 },
        { id: 'c', score: 200, penaltySeconds: 50 },
        { id: 'd', score: 200, penaltySeconds: 50 },
        { id: 'e', score: 0, penaltySeconds: 0 },
      ]);
      expect(ranked.map((r) => ({ id: r.id, rank: r.rank }))).toEqual([
        { id: 'a', rank: 1 },
        { id: 'b', rank: 1 },
        { id: 'c', rank: 3 },
        { id: 'd', rank: 3 },
        { id: 'e', rank: 5 },
      ]);
    });
  });
});
