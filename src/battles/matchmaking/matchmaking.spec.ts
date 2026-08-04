import { pairPlayers, allowedWindow, QueuedPlayer, PairingParams } from './matchmaking';

const PARAMS: PairingParams = { baseWindow: 50, growthPerSecond: 10, maxWindow: 400 };

function player(userId: string, rating: number, joinedMinutesAgo: number): QueuedPlayer {
  return { userId, rating, joinedAt: new Date(Date.now() - joinedMinutesAgo * 60_000) };
}

describe('matchmaking', () => {
  describe('allowedWindow', () => {
    it('returns baseWindow for a player who just joined', () => {
      const now = new Date();
      const p = { userId: 'u1', rating: 1200, joinedAt: now };
      expect(allowedWindow(p, now, PARAMS)).toBe(50);
    });

    it('widens linearly with elapsed seconds', () => {
      const joinedAt = new Date(Date.now() - 10_000); // 10 seconds ago
      const now = new Date();
      const p = { userId: 'u1', rating: 1200, joinedAt };
      expect(allowedWindow(p, now, PARAMS)).toBeCloseTo(150, 0); // 50 + 10*10
    });

    it('caps at maxWindow', () => {
      const joinedAt = new Date(Date.now() - 100_000); // long ago
      const now = new Date();
      const p = { userId: 'u1', rating: 1200, joinedAt };
      expect(allowedWindow(p, now, PARAMS)).toBe(400);
    });
  });

  describe('pairPlayers', () => {
    it('returns empty for fewer than 2 players', () => {
      expect(pairPlayers([], new Date(), PARAMS)).toEqual([]);
      expect(pairPlayers([player('a', 1200, 0)], new Date(), PARAMS)).toEqual([]);
    });

    it('pairs two players with equal rating', () => {
      const now = new Date();
      const a = player('a', 1200, 0);
      const b = player('b', 1200, 0);
      const pairs = pairPlayers([a, b], now, PARAMS);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].a.userId).toBe('a');
      expect(pairs[0].b.userId).toBe('b');
    });

    it('pairs two players within window', () => {
      const now = new Date();
      const a = player('a', 1200, 0);
      const b = player('b', 1220, 0);
      const pairs = pairPlayers([a, b], now, PARAMS);
      expect(pairs).toHaveLength(1);
    });

    it('does not pair two players outside window', () => {
      const now = new Date();
      const a = player('a', 1000, 0);
      const b = player('b', 1300, 0);
      expect(pairPlayers([a, b], now, PARAMS)).toEqual([]);
    });

    it('pairs the closest-rated opponents', () => {
      const now = new Date();
      const a = player('a', 1200, 0);
      const b = player('b', 1205, 0);
      const c = player('c', 1230, 0);
      const pairs = pairPlayers([a, b, c], now, PARAMS);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].a.userId).toBe('a');
      expect(pairs[0].b.userId).toBe('b');
    });

    it('leaves unpaired players when odd count', () => {
      const now = new Date();
      const a = player('a', 1200, 0);
      const b = player('b', 1201, 0);
      const c = player('c', 1202, 0);
      const pairs = pairPlayers([a, b, c], now, PARAMS);
      expect(pairs).toHaveLength(1);
    });

    it('widens window over wait time allowing older matches', () => {
      const now = new Date();
      const a = player('a', 1000, 30); // 30 min ago → window = min(400, 50+1800) = 400
      const b = player('b', 1300, 0); // just joined → window = 50
      // b's window = 50, a's window = 400, effective = 50, dist = 300 → no pair
      expect(pairPlayers([a, b], now, PARAMS)).toEqual([]);

      // After enough wait, b's window also grows — but both are fresh, so still no.
      // This tests the symmetric window check.
    });

    it('symmetric: both players must be within each others windows', () => {
      const now = new Date();
      const a = player('a', 1000, 0); // window = 50
      const b = player('b', 1060, 0); // dist = 60 > 50, no pair
      expect(pairPlayers([a, b], now, PARAMS)).toEqual([]);
    });

    it('is deterministic given same input', () => {
      const now = new Date();
      const players = [
        player('a', 1200, 5),
        player('b', 1180, 3),
        player('c', 1220, 1),
        player('d', 1190, 2),
      ];
      const result1 = pairPlayers(players, now, PARAMS);
      const result2 = pairPlayers(players, now, PARAMS);
      expect(result1).toEqual(result2);
    });

    it('pairs four players into two pairs', () => {
      const now = new Date();
      const players = [
        player('a', 1200, 0),
        player('b', 1201, 0),
        player('c', 1202, 0),
        player('d', 1203, 0),
      ];
      const pairs = pairPlayers(players, now, PARAMS);
      expect(pairs).toHaveLength(2);
    });
  });
});
