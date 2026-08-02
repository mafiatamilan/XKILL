import { StartedPostgreSqlContainer, PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const ENV_FILE = join(__dirname, '.global-env.json');

let postgres: StartedPostgreSqlContainer | undefined;
let redis: StartedRedisContainer | undefined;

/**
 * Boots one Postgres + one Redis container for the whole e2e run. Each suite then
 * provisions its own isolated database (see test/support/test-db.ts).
 */
export default async function globalSetup(): Promise<void> {
  postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
  redis = await new RedisContainer('redis:7-alpine').start();

  const postgresAdminUrl = `postgresql://${postgres.getUsername()}:${postgres.getPassword()}@${postgres.getHost()}:${postgres.getPort()}/postgres?schema=public`;

  const env: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '3000',
    POSTGRES_ADMIN_URL: postgresAdminUrl,
    DATABASE_URL: postgresAdminUrl,
    REDIS_URL: redis.getConnectionUrl(),
    JWT_ACCESS_SECRET: `test-access-secret-${randomUUID()}${randomUUID()}`,
    JWT_ACCESS_TTL_SECONDS: '60',
    JWT_REFRESH_TTL_DAYS: '1',
    JWT_ISSUER: 'xkill-backend-test',
    JWT_AUDIENCE: 'xkill-app-test',
    DEFAULT_ROLE: 'student',
    APP_URL: 'http://localhost:3000',
    WEB_APP_URL: 'http://localhost:3000',
    TWO_FACTOR_ISSUER: 'XKILL-Test',
    MAIL_DRIVER: 'console',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'noreply@xkill.app',
    JUDGE0_BASE_URL: '',
    JUDGE0_AUTH_TOKEN: '',
    JUDGE0_POLL_INTERVAL_MS: '100',
    JUDGE0_GRADE_TIMEOUT_MS: '3000',
    OPENCODE_BASE_URL: 'https://opencode.ai/zen/v1/responses',
    OPENCODE_API_KEY: '',
    OPENCODE_PROVIDER: 'opencode',
    OPENCODE_MODEL: 'deepseek-v4-flash-free',
    OPENCODE_MAX_TOKENS: '2048',
    RATE_LIMIT_TTL_MS: '60000',
    RATE_LIMIT_LIMIT: '100000',
    AUTH_RATE_LIMIT_LIMIT: '100000',
    ADMIN_EMAIL: 'admin@xkill.app',
    ADMIN_PASSWORD: 'Admin@1234',
  };

  writeFileSync(ENV_FILE, JSON.stringify(env, null, 2));
}

export async function globalTeardown(): Promise<void> {
  if (postgres) {
    await postgres.stop();
  }
  if (redis) {
    await redis.stop();
  }
}
