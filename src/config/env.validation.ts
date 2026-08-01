import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(30).default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  JWT_ISSUER: z.string().default('xkill-backend'),
  JWT_AUDIENCE: z.string().default('xkill-app'),

  DEFAULT_ROLE: z.string().min(1).default('student'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),

  TWO_FACTOR_ISSUER: z.string().default('XKILL'),

  OAUTH_GOOGLE_CLIENT_ID: z.string().optional().default(''),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  OAUTH_GOOGLE_CALLBACK_URL: z.string().url().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional().default(''),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  OAUTH_GITHUB_CALLBACK_URL: z.string().url().optional(),
  OAUTH_LINKEDIN_CLIENT_ID: z.string().optional().default(''),
  OAUTH_LINKEDIN_CLIENT_SECRET: z.string().optional().default(''),
  OAUTH_LINKEDIN_CALLBACK_URL: z.string().url().optional(),

  MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().email().optional().default('noreply@xkill.app'),

  JUDGE0_BASE_URL: z.string().optional().default(''),
  JUDGE0_AUTH_TOKEN: z.string().optional().default(''),

  RATE_LIMIT_TTL_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_LIMIT: z.coerce.number().int().min(1).default(120),
  AUTH_RATE_LIMIT_LIMIT: z.coerce.number().int().min(1).default(10),

  ADMIN_EMAIL: z.string().email().optional().default('admin@xkill.app'),
  ADMIN_PASSWORD: z.string().optional().default('Admin@1234'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    const messages = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }
  return parsed.data;
}
