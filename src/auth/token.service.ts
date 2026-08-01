import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { AppConfigService } from '../config/app-config.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  sid?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const { jwt: cfg } = this.config.get();
    return this.jwt.signAsync(payload, {
      secret: cfg.accessSecret,
      expiresIn: cfg.accessTtlSeconds,
      issuer: cfg.issuer,
      audience: cfg.audience,
    });
  }

  accessTokenExpirySeconds(): number {
    return this.config.get().jwt.accessTtlSeconds;
  }
}
