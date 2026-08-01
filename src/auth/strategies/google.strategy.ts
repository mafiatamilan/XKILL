import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/app-config.service';
import { OAuthService } from '../oauth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: AppConfigService,
    private readonly oauth: OAuthService,
  ) {
    super({
      clientID: config.get().oauth.google.clientId || 'unconfigured',
      clientSecret: config.get().oauth.google.clientSecret || 'unconfigured',
      callbackURL:
        config.get().oauth.google.callbackUrl ??
        'http://localhost:3000/api/v1/auth/oauth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const result = await this.oauth.authenticate({
        provider: 'google',
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName ?? profile.emails?.[0]?.value ?? profile.id,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
