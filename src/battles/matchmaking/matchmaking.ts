export interface QueuedPlayer {
  userId: string;
  rating: number;
  joinedAt: Date;
}

export interface PairingParams {
  baseWindow: number;
  growthPerSecond: number;
  maxWindow: number;
}

const DEFAULT_PARAMS: PairingParams = {
  baseWindow: 50,
  growthPerSecond: 10,
  maxWindow: 400,
};

export function allowedWindow(
  player: QueuedPlayer,
  now: Date,
  params: PairingParams = DEFAULT_PARAMS,
): number {
  const elapsed = Math.max(0, (now.getTime() - player.joinedAt.getTime()) / 1000);
  return Math.min(params.maxWindow, params.baseWindow + elapsed * params.growthPerSecond);
}

export interface Pair {
  a: QueuedPlayer;
  b: QueuedPlayer;
}

/**
 * Deterministic pairing function: sorts players by rating, greedily pairs each
 * unpaired player with the closest-rated opponent within both players' allowed
 * windows. Symmetric: both players must be within each other's window.
 *
 * Returns pairs in order of discovery (by ascending rating of the lower-rated
 * member). Leftover players remain unmatched.
 */
export function pairPlayers(
  players: QueuedPlayer[],
  now: Date,
  params: PairingParams = DEFAULT_PARAMS,
): Pair[] {
  if (players.length < 2) {
    return [];
  }

  const sorted = [...players].sort(
    (a, b) => a.rating - b.rating || a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  const paired = new Set<string>();
  const pairs: Pair[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].userId)) {
      continue;
    }

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].userId)) {
        continue;
      }

      const dist = Math.abs(sorted[i].rating - sorted[j].rating);
      const windowI = allowedWindow(sorted[i], now, params);
      const windowJ = allowedWindow(sorted[j], now, params);
      const effectiveWindow = Math.min(windowI, windowJ);

      if (dist <= effectiveWindow && dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      paired.add(sorted[i].userId);
      paired.add(sorted[bestIdx].userId);
      pairs.push({ a: sorted[i], b: sorted[bestIdx] });
    }
  }

  return pairs;
}
