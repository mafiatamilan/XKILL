import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface RankedEntry {
  member: string;
  score: number;
  rank: number; // 0-based, best (highest score) = 0
}

/**
 * Generic leaderboard over Redis sorted sets. No contest/leaderboard knowledge
 * lives here — callers pick their own keys and encode their own score. Reused
 * by Module 5.10 (global/college/department/company/weekly/monthly boards) as-is.
 */
@Injectable()
export class RankingService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async upsert(key: string, member: string, score: number): Promise<void> {
    await this.redis.zadd(key, score, member);
  }

  async remove(key: string, member: string): Promise<void> {
    await this.redis.zrem(key, member);
  }

  async top(key: string, count: number): Promise<RankedEntry[]> {
    if (count <= 0) {
      return [];
    }
    const raw = await this.redis.zrevrange(key, 0, count - 1, 'WITHSCORES');
    return this.toEntries(raw);
  }

  /** 0-based descending rank, or null when the member is not in the set. */
  async rankOf(key: string, member: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(key, member);
    return rank === null || rank === undefined ? null : rank;
  }

  /** The member plus `radius` neighbours above and below it, best-first. */
  async around(key: string, member: string, radius: number): Promise<RankedEntry[]> {
    const rank = await this.rankOf(key, member);
    if (rank === null) {
      return [];
    }
    const start = Math.max(0, rank - radius);
    const end = rank + radius;
    const raw = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    return this.toEntries(raw, start);
  }

  /** A contiguous slice of the board, best-first (0-based start/end inclusive). */
  async slice(key: string, start: number, end: number): Promise<RankedEntry[]> {
    if (start < 0 || end < start) {
      return [];
    }
    const raw = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    return this.toEntries(raw, start);
  }

  async scoreOf(key: string, member: string): Promise<number | null> {
    const score = await this.redis.zscore(key, member);
    return score === null || score === undefined ? null : Number(score);
  }

  async count(key: string): Promise<number> {
    return this.redis.zcard(key);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private toEntries(raw: string[], rankOffset = 0): RankedEntry[] {
    const entries: RankedEntry[] = [];
    for (let i = 0; i + 1 < raw.length; i += 2) {
      entries.push({
        member: raw[i],
        score: Number(raw[i + 1]),
        rank: rankOffset + entries.length,
      });
    }
    return entries;
  }
}
