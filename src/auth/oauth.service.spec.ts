import { ServiceUnavailableException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OAuthService } from './oauth.service';
import { mockConfig, mockUser } from '../testing/mocks';

describe('OAuthService', () => {
  let repository: jest.Mocked<Pick<AuthRepository, keyof AuthRepository>>;
  let tokens: jest.Mocked<TokenService>;
  let auth: jest.Mocked<AuthService>;
  let service: OAuthService;

  beforeEach(() => {
    repository = {
      findOAuthAccount: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findRoleByName: jest.fn(),
      createUser: jest.fn(),
      createOAuthAccount: jest.fn(),
      setUserEmailVerifiedIfNeeded: jest.fn(),
      findTwoFactor: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    tokens = {
      accessTokenExpirySeconds: jest.fn().mockReturnValue(900),
    } as unknown as jest.Mocked<TokenService>;
    auth = {
      createSession: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
    } as unknown as jest.Mocked<AuthService>;
    service = new OAuthService(repository as unknown as AuthRepository, mockConfig(), tokens, auth);
  });

  describe('generateAuthorizeUrl', () => {
    it('throws when a provider is not configured', () => {
      const svc = new OAuthService(
        repository as unknown as AuthRepository,
        mockConfig(),
        tokens,
        auth,
      );
      expect(() => svc.generateAuthorizeUrl('google')).toThrow(ServiceUnavailableException);
    });

    it('builds provider authorize URLs when configured', () => {
      const svc = new OAuthService(
        repository as unknown as AuthRepository,
        mockConfig({
          oauth: {
            google: { clientId: 'gid', clientSecret: 'gsecret' },
            github: { clientId: 'ghid', clientSecret: 'ghsecret' },
            linkedin: { clientId: 'lid', clientSecret: 'lsecret' },
          },
        }),
        tokens,
        auth,
      );
      const googleUrl = svc.generateAuthorizeUrl('google');
      expect(googleUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(googleUrl).toContain('client_id=gid');
      expect(svc.generateAuthorizeUrl('github')).toContain('github.com/login/oauth/authorize');
      expect(svc.generateAuthorizeUrl('linkedin')).toContain('linkedin.com/oauth/v2/authorization');
    });
  });

  describe('authenticate', () => {
    const profile = {
      provider: 'google' as const,
      providerAccountId: 'google-1',
      email: 'new@example.com',
      displayName: 'New User',
    };

    it('links an existing OAuth account', async () => {
      const user = mockUser();
      repository.findOAuthAccount.mockResolvedValue({ user } as any);
      repository.findTwoFactor.mockResolvedValue(null);
      const result = await service.authenticate(profile);
      expect(auth.createSession).toHaveBeenCalledWith(user);
      expect(result.accessToken).toBe('at');
      expect(result.user.email).toBe('student@example.com');
    });

    it('matches an existing user by email and links the account', async () => {
      const user = mockUser();
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(user);
      repository.findById.mockResolvedValue(user);
      repository.findTwoFactor.mockResolvedValue(null);
      await service.authenticate(profile);
      expect(repository.createOAuthAccount).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google', providerAccountId: 'google-1' }),
      );
      expect(repository.setUserEmailVerifiedIfNeeded).toHaveBeenCalled();
    });

    it('creates a new user when none matches', async () => {
      const user = mockUser();
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue({ id: 'role-1', name: 'student' } as any);
      repository.createUser.mockResolvedValue(user);
      repository.findTwoFactor.mockResolvedValue(null);
      await service.authenticate(profile);
      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', fullName: 'New User' }),
      );
    });

    it('falls back to a provider-generated email when the profile has none', async () => {
      const user = mockUser();
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue({ id: 'role-1', name: 'student' } as any);
      repository.createUser.mockResolvedValue(user);
      repository.findTwoFactor.mockResolvedValue(null);
      await service.authenticate({
        provider: 'github',
        providerAccountId: 'gh-1',
        displayName: 'Gh',
      });
      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'gh-1@github.xkill.local' }),
      );
    });

    it('throws when an existing matched user cannot be re-resolved', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(mockUser());
      repository.findById.mockResolvedValue(null);
      await expect(service.authenticate(profile)).rejects.toThrow(/Failed to resolve user/);
    });

    it('throws when the default role is not seeded', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue(null);
      await expect(service.authenticate(profile)).rejects.toThrow(/not seeded/);
    });
  });
});
