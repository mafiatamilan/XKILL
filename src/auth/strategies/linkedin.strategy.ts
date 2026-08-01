import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-linkedin-oauth2';
import { AppConfigService } from '../../config/app-config.service';
import { OAuthService } from '../oauth.service';

type LinkedinVerifyCallback = (err?: Error | null, user?: unknown) => void;

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    config: AppConfigService,
    private readonly oauth: OAuthService,
  ) {
    super({
      clientID: config.get().oauth.linkedin.clientId || 'unconfigured',
      clientSecret: config.get().oauth.linkedin.clientSecret || 'unconfigured',
      callbackURL:
        config.get().oauth.linkedin.callbackUrl ??
        'http://localhost:3000/api/v1/auth/oauth/linkedin/callback',
      scope: ['r_liteprofile', 'r_emailaddress'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: LinkedinVerifyCallback,
  ): Promise<void> {
    try {
      const result = await this.oauth.authenticate({
        provider: 'linkedin',
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName ?? profile.id,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
