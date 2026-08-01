import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl?: string;
}

export interface AppConfig {
  env: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    issuer: string;
    audience: string;
  };
  defaultRole: string;
  appUrl: string;
  webAppUrl: string;
  twoFactorIssuer: string;
  oauth: {
    google: OAuthProviderConfig;
    github: OAuthProviderConfig;
    linkedin: OAuthProviderConfig;
  };
  mail: {
    driver: string;
    from: string;
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  judge0BaseUrl: string;
  judge0AuthToken: string;
  rateLimit: {
    ttlMs: number;
    limit: number;
    authLimit: number;
  };
  adminEmail: string;
  adminPassword: string;
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private readonly config: ConfigService) {}

  get(): AppConfig {
    const cfg: AppConfig = {
      env: this.config.getOrThrow<string>('NODE_ENV'),
      port: this.config.getOrThrow<number>('PORT'),
      databaseUrl: this.config.getOrThrow<string>('DATABASE_URL'),
      redisUrl: this.config.getOrThrow<string>('REDIS_URL'),
      jwt: {
        accessSecret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        accessTtlSeconds: this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
        refreshTtlDays: this.config.getOrThrow<number>('JWT_REFRESH_TTL_DAYS'),
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
      },
      defaultRole: this.config.getOrThrow<string>('DEFAULT_ROLE'),
      appUrl: this.config.getOrThrow<string>('APP_URL'),
      webAppUrl: this.config.getOrThrow<string>('WEB_APP_URL'),
      twoFactorIssuer: this.config.getOrThrow<string>('TWO_FACTOR_ISSUER'),
      oauth: {
        google: this.oauthProvider('google'),
        github: this.oauthProvider('github'),
        linkedin: this.oauthProvider('linkedin'),
      },
      mail: {
        driver: this.config.getOrThrow<string>('MAIL_DRIVER'),
        from: this.config.getOrThrow<string>('SMTP_FROM'),
        host: this.config.getOrThrow<string>('SMTP_HOST'),
        port: this.config.getOrThrow<number>('SMTP_PORT'),
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASS'),
      },
      judge0BaseUrl: this.config.getOrThrow<string>('JUDGE0_BASE_URL'),
      judge0AuthToken: this.config.getOrThrow<string>('JUDGE0_AUTH_TOKEN'),
      rateLimit: {
        ttlMs: this.config.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
        limit: this.config.getOrThrow<number>('RATE_LIMIT_LIMIT'),
        authLimit: this.config.getOrThrow<number>('AUTH_RATE_LIMIT_LIMIT'),
      },
      adminEmail: this.config.getOrThrow<string>('ADMIN_EMAIL'),
      adminPassword: this.config.getOrThrow<string>('ADMIN_PASSWORD'),
    };
    return cfg;
  }

  private oauthProvider(provider: 'google' | 'github' | 'linkedin'): OAuthProviderConfig {
    const prefix = provider.toUpperCase();
    return {
      clientId: this.config.get<string>(`OAUTH_${prefix}_CLIENT_ID`) ?? '',
      clientSecret: this.config.get<string>(`OAUTH_${prefix}_CLIENT_SECRET`) ?? '',
      callbackUrl: this.config.get<string>(`OAUTH_${prefix}_CALLBACK_URL`),
    };
  }
}
