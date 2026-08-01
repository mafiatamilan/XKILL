import { Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import {
  DatabaseHealthIndicator,
  Judge0HealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly judge0: Judge0HealthIndicator,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const indicators: HealthIndicatorFunction[] = [
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ];
    if (this.judge0.isEnabled) {
      indicators.push(() => this.judge0.isHealthy('judge0'));
    }
    return this.health.check(indicators);
  }
}
