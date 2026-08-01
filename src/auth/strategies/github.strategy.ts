import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AppConfigService } from '../../config/app-config.service';
import { OAuthService } from '../oauth.service';

type GithubVerifyCallback = (err?: Error | null, user?: unknown) => void;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: AppConfigService,
    private readonly oauth: OAuthService,
  ) {
    super({
      clientID: config.get().oauth.github.clientId || 'unconfigured',
      clientSecret: config.get().oauth.github.clientSecret || 'unconfigured',
      callbackURL:
        config.get().oauth.github.callbackUrl ??
        'http://localhost:3000/api/v1/auth/oauth/github/callback',
      scope: ['read:user', 'user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: GithubVerifyCallback,
  ): Promise<void> {
    try {
      const result = await this.oauth.authenticate({
        provider: 'github',
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName ?? profile.username ?? profile.id,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
