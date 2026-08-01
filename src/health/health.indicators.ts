import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      return this.getStatus(key, pong === 'PONG');
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}

@Injectable()
export class Judge0HealthIndicator extends HealthIndicator {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  get isEnabled(): boolean {
    return Boolean(this.config.get().judge0BaseUrl);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.isEnabled) {
      return this.getStatus(key, true, { enabled: false });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${this.config.get().judge0BaseUrl.replace(/\/$/, '')}/about`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return this.getStatus(key, response.ok, { status: response.status });
    } catch (error) {
      throw new HealthCheckError(
        'Judge0 check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
