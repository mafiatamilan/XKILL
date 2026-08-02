import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let get: jest.Mock;
  let getOrThrow: jest.Mock;
  let service: AppConfigService;

  beforeEach(() => {
    const values: Record<string, string | number> = {
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: 'postgres://x',
      REDIS_URL: 'redis://x',
      JWT_ACCESS_SECRET: 's'.repeat(32),
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_DAYS: 30,
      JWT_ISSUER: 'iss',
      JWT_AUDIENCE: 'aud',
      DEFAULT_ROLE: 'student',
      APP_URL: 'http://localhost:3000',
      WEB_APP_URL: 'http://localhost:3000',
      TWO_FACTOR_ISSUER: 'XKILL',
      MAIL_DRIVER: 'console',
      SMTP_FROM: 'noreply@xkill.app',
      SMTP_HOST: '',
      SMTP_PORT: 587,
      SMTP_USER: '',
      SMTP_PASS: '',
      JUDGE0_BASE_URL: '',
      JUDGE0_AUTH_TOKEN: '',
      OPENCODE_BASE_URL: 'https://opencode.ai/zen/v1/responses',
      OPENCODE_API_KEY: '',
      OPENCODE_PROVIDER: 'opencode',
      OPENCODE_MODEL: 'deepseek-v4-flash-free',
      OPENCODE_MAX_TOKENS: 2048,
      RATE_LIMIT_TTL_MS: 60000,
      RATE_LIMIT_LIMIT: 120,
      AUTH_RATE_LIMIT_LIMIT: 10,
      ADMIN_EMAIL: 'admin@xkill.app',
      ADMIN_PASSWORD: 'Admin@1234',
    };
    get = jest.fn((key: string) => values[key]);
    getOrThrow = jest.fn((key: string) => {
      if (key in values) return values[key];
      throw new Error(`Missing ${key}`);
    });
    service = new AppConfigService({ get, getOrThrow } as unknown as ConfigService);
  });

  it('builds the full config tree', () => {
    const cfg = service.get();
    expect(cfg.env).toBe('test');
    expect(cfg.jwt).toMatchObject({ issuer: 'iss', audience: 'aud' });
    expect(cfg.oauth.google).toEqual({ clientId: '', clientSecret: '', callbackUrl: undefined });
    expect(cfg.mail.from).toBe('noreply@xkill.app');
  });

  it('reads OAuth credentials with the provider prefix', () => {
    get.mockImplementation((key: string) => {
      if (key === 'OAUTH_GOOGLE_CLIENT_ID') return 'gid';
      if (key === 'OAUTH_GOOGLE_CLIENT_SECRET') return 'gsecret';
      if (key === 'OAUTH_GOOGLE_CALLBACK_URL') return 'http://cb';
      return undefined;
    });
    const cfg = service.get();
    expect(cfg.oauth.google).toEqual({
      clientId: 'gid',
      clientSecret: 'gsecret',
      callbackUrl: 'http://cb',
    });
  });
});
