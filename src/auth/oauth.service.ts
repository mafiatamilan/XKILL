import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AuthRepository, UserWithRole } from './auth.repository';
import { AuthService, randomPasswordHashPlaceholder } from './auth.service';
import { TokenService } from './token.service';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';

export type OAuthProvider = 'google' | 'github' | 'linkedin';

export interface NormalizedOAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: AppConfigService,
    private readonly tokens: TokenService,
    private readonly auth: AuthService,
  ) {}

  isConfigured(provider: OAuthProvider): boolean {
    const cfg = this.config.get().oauth[provider];
    return Boolean(cfg.clientId && cfg.clientSecret);
  }

  generateAuthorizeUrl(provider: OAuthProvider): string {
    if (!this.isConfigured(provider)) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: `OAuth provider '${provider}' is not configured on the server`,
      });
    }
    const cfg = this.config.get().oauth[provider];
    const redirect = encodeURIComponent(
      cfg.callbackUrl ?? `${this.config.get().appUrl}/api/v1/auth/oauth/${provider}/callback`,
    );
    switch (provider) {
      case 'google': {
        const params = new URLSearchParams({
          client_id: cfg.clientId,
          redirect_uri: redirect,
          response_type: 'code',
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'select_account',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      }
      case 'github': {
        const params = new URLSearchParams({
          client_id: cfg.clientId,
          redirect_uri: redirect,
          scope: 'read:user user:email',
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
      }
      case 'linkedin': {
        const params = new URLSearchParams({
          client_id: cfg.clientId,
          redirect_uri: redirect,
          response_type: 'code',
          scope: 'r_liteprofile r_emailaddress',
        });
        return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      }
    }
  }

  async authenticate(profile: NormalizedOAuthProfile): Promise<AuthResponseDto> {
    const user = await this.linkOrCreateUser(profile);
    const { accessToken, refreshToken } = await this.auth.createSession(user);
    const twoFactor = await this.repository.findTwoFactor(user.id);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.tokens.accessTokenExpirySeconds(),
      user: UserResponseDto.fromEntity(user, twoFactor?.isEnabled ?? false),
    };
  }

  private async linkOrCreateUser(profile: NormalizedOAuthProfile): Promise<UserWithRole> {
    const existing = await this.repository.findOAuthAccount(
      profile.provider,
      profile.providerAccountId,
    );
    if (existing) {
      return existing.user;
    }

    let user: UserWithRole | null = null;
    if (profile.email) {
      user = await this.repository.findByEmail(profile.email.toLowerCase());
    }

    if (!user) {
      const role = await this.repository.findRoleByName(this.config.get().defaultRole);
      if (!role) {
        throw new Error(`Default role '${this.config.get().defaultRole}' is not seeded`);
      }
      user = await this.repository.createUser({
        email: profile.email
          ? profile.email.toLowerCase()
          : `${profile.providerAccountId}@${profile.provider}.xkill.local`,
        passwordHash: randomPasswordHashPlaceholder(),
        fullName: profile.displayName,
        roleId: role.id,
      });
    } else {
      user = await this.repository.findById(user.id);
    }

    if (!user) {
      throw new Error(`Failed to resolve user for OAuth provider '${profile.provider}'`);
    }

    await this.repository.createOAuthAccount({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      providerEmail: profile.email,
      profileJson: { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
    });
    await this.repository.setUserEmailVerifiedIfNeeded(user.id, new Date());
    return user;
  }
}
