import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgres://localhost/db',
    REDIS_URL: 'redis://localhost',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
  };

  it('returns defaults for unset optional values', () => {
    const env = validateEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DEFAULT_ROLE).toBe('student');
    expect(env.MAIL_DRIVER).toBe('console');
  });

  it('coerces numeric env vars', () => {
    const env = validateEnv({ ...base, PORT: '8080', JWT_ACCESS_TTL_SECONDS: '900' });
    expect(env.PORT).toBe(8080);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /Environment validation failed/,
    );
  });

  it('rejects a missing required variable', () => {
    expect(() => validateEnv({ REDIS_URL: 'x', JWT_ACCESS_SECRET: 'y'.repeat(32) })).toThrow();
  });

  it('rejects invalid enum values', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging', MAIL_DRIVER: 'log' })).toThrow();
  });
});
