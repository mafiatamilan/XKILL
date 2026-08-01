import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('delegates to the health service', () => {
    const health = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
    const controller = new HealthController(health as unknown as HealthService);
    expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });
});
