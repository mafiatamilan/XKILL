import { AppConfig, AppConfigService } from '../config/app-config.service';

export function mockConfig(overrides: Partial<AppConfig> = {}): AppConfigService {
  const base: AppConfig = {
    env: 'test',
    port: 3000,
    databaseUrl: 'postgres://localhost/xkill',
    redisUrl: 'redis://localhost:6379',
    jwt: {
      accessSecret: 'test-access-secret-0123456789abcdefghijklmnop',
      accessTtlSeconds: 900,
      refreshTtlDays: 30,
      issuer: 'issuer',
      audience: 'audience',
    },
    defaultRole: 'student',
    appUrl: 'http://localhost:3000',
    webAppUrl: 'http://localhost:3000',
    twoFactorIssuer: 'XKILL',
    oauth: {
      google: { clientId: '', clientSecret: '' },
      github: { clientId: '', clientSecret: '' },
      linkedin: { clientId: '', clientSecret: '' },
    },
    mail: { driver: 'console', from: 'noreply@xkill.app', host: '', port: 587, user: '', pass: '' },
    judge0BaseUrl: '',
    judge0AuthToken: '',
    ai: {
      baseUrl: 'https://opencode.ai/zen/v1/responses',
      apiKey: '',
      provider: 'opencode',
      model: 'deepseek-v4-flash-free',
      maxTokens: 2048,
    },
    rateLimit: { ttlMs: 60000, limit: 100, authLimit: 10 },
    adminEmail: 'admin@xkill.app',
    adminPassword: 'Admin@1234',
  };
  const merged: AppConfig = {
    ...base,
    ...overrides,
    jwt: { ...base.jwt, ...(overrides.jwt ?? {}) },
    oauth: {
      google: { ...base.oauth.google, ...(overrides.oauth?.google ?? {}) },
      github: { ...base.oauth.github, ...(overrides.oauth?.github ?? {}) },
      linkedin: { ...base.oauth.linkedin, ...(overrides.oauth?.linkedin ?? {}) },
    },
    mail: { ...base.mail, ...(overrides.mail ?? {}) },
    rateLimit: { ...base.rateLimit, ...(overrides.rateLimit ?? {}) },
  };
  return { get: () => merged } as unknown as AppConfigService;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mockUser(overrides: Record<string, unknown> = {}): any {
  const now = new Date();
  return {
    id: 'user-1',
    email: 'student@example.com',
    passwordHash: '$2a$04$placeholder',
    fullName: 'Test User',
    roleId: 'role-1',
    isActive: true,
    emailVerifiedAt: now,
    suspendedAt: null,
    suspendReason: null,
    deletedAt: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    role: { id: 'role-1', name: 'student', permissions: [{ name: 'read:self' }] },
    ...overrides,
  };
}
