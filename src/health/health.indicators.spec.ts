import { HealthCheckError } from '@nestjs/terminus';
import {
  DatabaseHealthIndicator,
  Judge0HealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';
import { PrismaService } from '../prisma/prisma.service';
import { mockConfig } from '../testing/mocks';

describe('DatabaseHealthIndicator', () => {
  it('reports healthy when the query succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    } as unknown as PrismaService;
    const indicator = new DatabaseHealthIndicator(prisma);
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    });
  });

  it('throws HealthCheckError when the query fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('conn refused')),
    } as unknown as PrismaService;
    const indicator = new DatabaseHealthIndicator(prisma);
    await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(HealthCheckError);
  });
});

describe('RedisHealthIndicator', () => {
  it('reports healthy when pong comes back', async () => {
    const redis = { ping: jest.fn().mockResolvedValue('PONG') } as any;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.isHealthy('redis')).resolves.toEqual({ redis: { status: 'up' } });
  });

  it('reports down when pong is not PONG', async () => {
    const redis = { ping: jest.fn().mockResolvedValue('NO') } as any;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.isHealthy('redis')).resolves.toEqual({ redis: { status: 'down' } });
  });

  it('throws HealthCheckError when ping rejects', async () => {
    const redis = { ping: jest.fn().mockRejectedValue(new Error('timeout')) } as any;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.isHealthy('redis')).rejects.toBeInstanceOf(HealthCheckError);
  });
});

describe('Judge0HealthIndicator', () => {
  it('is disabled when no base URL is configured', async () => {
    const indicator = new Judge0HealthIndicator(mockConfig({ judge0BaseUrl: '' }));
    expect(indicator.isEnabled).toBe(false);
    await expect(indicator.isHealthy('judge0')).resolves.toEqual({
      judge0: { status: 'up', enabled: false },
    });
  });

  it('checks the /about endpoint when enabled', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    try {
      const indicator = new Judge0HealthIndicator(mockConfig({ judge0BaseUrl: 'http://judge0' }));
      expect(indicator.isEnabled).toBe(true);
      const result = await indicator.isHealthy('judge0');
      expect(result.judge0).toMatchObject({ status: 200 });
    } finally {
      (global.fetch as jest.Mock).mockRestore();
    }
  });

  it('throws HealthCheckError when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    try {
      const indicator = new Judge0HealthIndicator(mockConfig({ judge0BaseUrl: 'http://judge0' }));
      await expect(indicator.isHealthy('judge0')).rejects.toBeInstanceOf(HealthCheckError);
    } finally {
      (global.fetch as jest.Mock).mockRestore();
    }
  });
});
