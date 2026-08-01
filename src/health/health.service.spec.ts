import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import {
  DatabaseHealthIndicator,
  Judge0HealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';

describe('HealthService', () => {
  const healthCheck = { check: jest.fn() };
  const db = { isHealthy: jest.fn() };
  const redis = { isHealthy: jest.fn() };
  const judge0 = { isEnabled: false, isHealthy: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks database and redis, and skips judge0 when disabled', async () => {
    const service = new HealthService(
      healthCheck as unknown as HealthCheckService,
      db as unknown as DatabaseHealthIndicator,
      redis as unknown as RedisHealthIndicator,
      judge0 as unknown as Judge0HealthIndicator,
    );
    healthCheck.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()));
      return { status: 'ok', info: Object.assign({}, ...results) };
    });
    db.isHealthy.mockResolvedValue({ database: { status: 'up' } });
    redis.isHealthy.mockResolvedValue({ redis: { status: 'up' } });

    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(judge0.isHealthy).not.toHaveBeenCalled();
  });

  it('includes judge0 when it is configured', async () => {
    const enabledJudge0 = { isEnabled: true, isHealthy: jest.fn() };
    const service = new HealthService(
      healthCheck as unknown as HealthCheckService,
      db as unknown as DatabaseHealthIndicator,
      redis as unknown as RedisHealthIndicator,
      enabledJudge0 as unknown as Judge0HealthIndicator,
    );
    healthCheck.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      await Promise.all(indicators.map((fn) => fn()));
      return { status: 'ok', info: {} };
    });
    db.isHealthy.mockResolvedValue({ database: { status: 'up' } });
    redis.isHealthy.mockResolvedValue({ redis: { status: 'up' } });
    enabledJudge0.isHealthy.mockResolvedValue({ judge0: { status: 'up' } });

    await service.check();
    expect(enabledJudge0.isHealthy).toHaveBeenCalled();
  });
});
