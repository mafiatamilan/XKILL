import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RankingService } from './ranking.service';

type Scored = { member: string; score: number };

/** In-memory sorted set emulating the ioredis commands RankingService uses. */
class FakeRedis {
  sets = new Map<string, Map<string, number>>();

  async zadd(key: string, score: number, member: string): Promise<number> {
    const set = this.sets.get(key) ?? new Map<string, number>();
    set.set(member, score);
    this.sets.set(key, set);
    return 1;
  }

  async zrem(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    const removed = set.delete(member);
    if (set.size === 0) this.sets.delete(key);
    return removed ? 1 : 0;
  }

  private sorted(key: string): Scored[] {
    const set = this.sets.get(key);
    if (!set) return [];
    return [...set.entries()]
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score || a.member.localeCompare(b.member));
  }

  async zrevrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]> {
    const rows = this.sorted(key).slice(start, stop === -1 ? undefined : stop + 1);
    if (args.includes('WITHSCORES')) {
      return rows.flatMap((row) => [row.member, String(row.score)]);
    }
    return rows.map((row) => row.member);
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    const rank = this.sorted(key).findIndex((row) => row.member === member);
    return rank === -1 ? null : rank;
  }

  async zscore(key: string, member: string): Promise<string | null> {
    const set = this.sets.get(key);
    const score = set?.get(member);
    return score === undefined ? null : String(score);
  }

  async zcard(key: string): Promise<number> {
    return this.sets.get(key)?.size ?? 0;
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.sets.delete(key)) removed += 1;
    }
    return removed;
  }
}

describe('RankingService', () => {
  let service: RankingService;
  let redis: FakeRedis;

  beforeEach(async () => {
    redis = new FakeRedis();
    const module = await Test.createTestingModule({
      providers: [RankingService, { provide: REDIS_CLIENT, useValue: redis as unknown as Redis }],
    }).compile();
    service = module.get(RankingService);
  });

  it('upserts a member and returns it at the top of the board', async () => {
    await service.upsert('board', 'u1', 50);
    await service.upsert('board', 'u2', 90);
    const top = await service.top('board', 10);
    expect(top).toEqual([
      { member: 'u2', score: 90, rank: 0 },
      { member: 'u1', score: 50, rank: 1 },
    ]);
  });

  it('re-scores on repeated upsert instead of duplicating', async () => {
    await service.upsert('board', 'u1', 10);
    await service.upsert('board', 'u1', 99);
    expect(await service.count('board')).toBe(1);
    expect(await service.scoreOf('board', 'u1')).toBe(99);
  });

  it('reports a 0-based rank and null for unknown members', async () => {
    await service.upsert('board', 'a', 5);
    await service.upsert('board', 'b', 9);
    expect(await service.rankOf('board', 'b')).toBe(0);
    expect(await service.rankOf('board', 'a')).toBe(1);
    expect(await service.rankOf('board', 'nope')).toBe(null);
  });

  it('slices the board best-first with absolute ranks', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await service.upsert('board', `m${i}`, i);
    }
    const slice = await service.slice('board', 1, 3);
    expect(slice).toEqual([
      { member: 'm4', score: 4, rank: 1 },
      { member: 'm3', score: 3, rank: 2 },
      { member: 'm2', score: 2, rank: 3 },
    ]);
  });

  it('returns the member plus neighbours around it', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await service.upsert('board', `m${i}`, i);
    }
    const around = await service.around('board', 'm3', 1);
    expect(around.map((e) => e.member)).toEqual(['m4', 'm3', 'm2']);
    expect(await service.around('board', 'absent', 1)).toEqual([]);
  });

  it('removes a member and resets a whole board', async () => {
    await service.upsert('board', 'a', 1);
    await service.upsert('board', 'b', 2);
    await service.remove('board', 'a');
    expect(await service.count('board')).toBe(1);
    expect(await service.scoreOf('board', 'a')).toBe(null);
    await service.reset('board');
    expect(await service.count('board')).toBe(0);
  });
});
