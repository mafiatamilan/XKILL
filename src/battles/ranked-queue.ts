import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export const BATTLE_QUEUE_KEY = 'battle:ranked:queue';
export const BATTLE_QUEUE_META_KEY = 'battle:ranked:queue:meta';

export interface QueuedEntry {
  rating: number;
  joinedAt: string; // ISO date
}

/**
 * Redis-backed ranked queue for the coding-battle matchmaking tick.
 * Members in the sorted set are userIds scored by rating.
 * A parallel hash stores per-member metadata (joinedAt).
 */
@Injectable()
export class RankedQueue {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async join(userId: string, rating: number): Promise<void> {
    const entry: QueuedEntry = { rating, joinedAt: new Date().toISOString() };
    await this.redis
      .multi()
      .zadd(BATTLE_QUEUE_KEY, rating, userId)
      .hset(BATTLE_QUEUE_META_KEY, userId, JSON.stringify(entry))
      .exec();
  }

  async leave(userId: string): Promise<boolean> {
    const res = await this.redis
      .multi()
      .zrem(BATTLE_QUEUE_KEY, userId)
      .hdel(BATTLE_QUEUE_META_KEY, userId)
      .exec();
    return res !== null && (res[0]?.[1] as number) === 1;
  }

  async isQueued(userId: string): Promise<boolean> {
    const score = await this.redis.zscore(BATTLE_QUEUE_KEY, userId);
    return score !== null;
  }

  async snapshot(): Promise<Array<{ userId: string; rating: number; joinedAt: Date }>> {
    const raw = await this.redis.zrevrange(BATTLE_QUEUE_KEY, 0, -1, 'WITHSCORES');
    if (raw.length === 0) return [];

    const userIds = raw.filter((_, i) => i % 2 === 0);
    const metaRaw = await this.redis.hmget(BATTLE_QUEUE_META_KEY, ...userIds);

    const result: Array<{ userId: string; rating: number; joinedAt: Date }> = [];
    for (let i = 0; i < userIds.length; i++) {
      const rating = Number(raw[i * 2 + 1]);
      const metaRawStr = metaRaw[i];
      let joinedAt: Date;
      if (metaRawStr) {
        const meta = JSON.parse(metaRawStr) as QueuedEntry;
        joinedAt = new Date(meta.joinedAt);
      } else {
        joinedAt = new Date();
      }
      result.push({ userId: userIds[i], rating, joinedAt });
    }
    return result;
  }

  /**
   * Atomically attempt to claim a pair from the queue.
   * Returns true only if both members were successfully removed.
   */
  async claim(userIdA: string, userIdB: string): Promise<boolean> {
    const res = await this.redis
      .multi()
      .zrem(BATTLE_QUEUE_KEY, userIdA)
      .zrem(BATTLE_QUEUE_KEY, userIdB)
      .hdel(BATTLE_QUEUE_META_KEY, userIdA)
      .hdel(BATTLE_QUEUE_META_KEY, userIdB)
      .exec();
    if (res === null) return false;
    const aRemoved = (res[0]?.[1] as number) === 1;
    const bRemoved = (res[1]?.[1] as number) === 1;
    return aRemoved && bRemoved;
  }

  async count(): Promise<number> {
    return this.redis.zcard(BATTLE_QUEUE_KEY);
  }
}
