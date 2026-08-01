import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { MailService } from '../mailer/mailer.service';
import { mockConfig, mockUser } from '../testing/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<Pick<AuthRepository, keyof AuthRepository>>;
  let tokens: jest.Mocked<TokenService>;
  let twoFactor: jest.Mocked<TwoFactorService>;
  let mailer: jest.Mocked<MailService>;

  beforeEach(async () => {
    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdActive: jest.fn(),
      createUser: jest.fn(),
      findRoleByName: jest.fn(),
      createSession: jest.fn(),
      findSessionByTokenHash: jest.fn(),
      rotateSession: jest.fn(),
      revokeSessionByHash: jest.fn(),
      revokeUserSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      listUserSessions: jest.fn(),
      countUserSessions: jest.fn(),
      upsertDevice: jest.fn(),
      createVerificationToken: jest.fn(),
      findVerificationTokenByHash: jest.fn(),
      consumeVerificationToken: jest.fn(),
      invalidateVerificationTokens: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findPasswordResetTokenByHash: jest.fn(),
      markResetTokenUsed: jest.fn(),
      setUserPassword: jest.fn(),
      findTwoFactor: jest.fn(),
      saveTwoFactorSecret: jest.fn(),
      enableTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
      findOAuthAccount: jest.fn(),
      createOAuthAccount: jest.fn(),
      setUserEmailVerifiedIfNeeded: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    tokens = {
      generateRefreshToken: jest.fn().mockReturnValue('raw-refresh'),
      hashToken: jest.fn((token: string) => `sha256:${token}`),
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      accessTokenExpirySeconds: jest.fn().mockReturnValue(900),
    } as unknown as jest.Mocked<TokenService>;

    twoFactor = {
      setup: jest.fn(),
      verifyCode: jest.fn().mockResolvedValue(true),
      enable: jest.fn(),
      disable: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorService>;

    mailer = { send: jest.fn() } as unknown as jest.Mocked<MailService>;

    service = new AuthService(
      repository as unknown as AuthRepository,
      tokens,
      twoFactor,
      mailer,
      mockConfig(),
    );
  });

  describe('register', () => {
    it('creates a user, sends a verification email and returns the response', async () => {
      const user = mockUser();
      repository.findByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue({ id: 'role-1', name: 'student' } as any);
      repository.createUser.mockResolvedValue(user);
      repository.findTwoFactor.mockResolvedValue(null);

      const result = await service.register({
        email: 'Student@Example.com',
        password: 'Password1',
        fullName: '  Test User ',
      });

      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'student@example.com', fullName: 'Test User' }),
      );
      expect(repository.createVerificationToken).toHaveBeenCalled();
      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'email-verification' }),
      );
      expect(result.verificationRequired).toBe(true);
      expect(result.user.email).toBe('student@example.com');
    });

    it('throws Conflict when the email is already registered', async () => {
      repository.findByEmail.mockResolvedValue(mockUser());
      await expect(
        service.register({ email: 'a@b.com', password: 'Password1', fullName: 'A' }),
      ).rejects.toMatchObject({ status: 409, response: { code: 'EMAIL_ALREADY_REGISTERED' } });
    });

    it('fails when the default role is not seeded', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue(null);
      await expect(
        service.register({ email: 'a@b.com', password: 'Password1', fullName: 'A' }),
      ).rejects.toThrow("Default role 'student' is not seeded");
    });
  });

  describe('login', () => {
    const passwordHash = bcrypt.hashSync('Password1', 4);

    it('returns tokens for valid credentials', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ passwordHash }));
      repository.findTwoFactor.mockResolvedValue(null);
      repository.upsertDevice.mockResolvedValue(undefined);
      repository.createSession.mockResolvedValue({ id: 'session-1' } as any);

      const result = await service.login(
        { email: 'student@example.com', password: 'Password1' },
        { ip: '1.2.3.4' },
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.user.email).toBe('student@example.com');
    });

    it('throws Unauthorized for an unknown email', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@example.com', password: 'Password1' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized for a wrong password', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ passwordHash }));
      await expect(
        service.login({ email: 'student@example.com', password: 'WrongPass1' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Forbidden for a suspended user', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ isActive: false }));
      const err = await service
        .login({ email: 'student@example.com', password: 'Password1' }, {})
        .catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.response.code).toBe('USER_SUSPENDED');
    });

    it('throws Forbidden when the email is not verified', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ emailVerifiedAt: null, passwordHash }));
      const err = await service
        .login({ email: 'student@example.com', password: 'Password1' }, {})
        .catch((e) => e);
      expect(err.response.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('requires a TOTP code when 2FA is enabled', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ passwordHash }));
      repository.findTwoFactor.mockResolvedValue({ isEnabled: true } as any);
      const err = await service
        .login({ email: 'student@example.com', password: 'Password1' }, {})
        .catch((e) => e);
      expect(err.response.code).toBe('TWO_FACTOR_REQUIRED');
    });

    it('rejects an invalid TOTP code', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ passwordHash }));
      repository.findTwoFactor.mockResolvedValue({ isEnabled: true } as any);
      twoFactor.verifyCode.mockResolvedValue(false);
      const err = await service
        .login({ email: 'student@example.com', password: 'Password1', totpCode: '123456' }, {})
        .catch((e) => e);
      expect(err.response.code).toBe('INVALID_TOTP');
    });

    it('accepts a valid TOTP code when 2FA is enabled', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ passwordHash }));
      repository.findTwoFactor.mockResolvedValue({ isEnabled: true } as any);
      twoFactor.verifyCode.mockResolvedValue(true);
      repository.upsertDevice.mockResolvedValue(undefined);
      repository.createSession.mockResolvedValue({ id: 'session-1' } as any);
      const result = await service.login(
        { email: 'student@example.com', password: 'Password1', totpCode: '123456' },
        {},
      );
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('refresh', () => {
    const session = {
      id: 'session-1',
      refreshTokenHash: 'sha256:old',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: mockUser(),
    };

    it('rotates the session and returns new tokens', async () => {
      repository.findSessionByTokenHash.mockResolvedValue(session as any);
      repository.rotateSession.mockResolvedValue(true);
      repository.findTwoFactor.mockResolvedValue(null);

      const result = await service.refresh('old', {});
      expect(repository.rotateSession).toHaveBeenCalled();
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.accessToken).toBe('access-token');
    });

    it('throws Unauthorized for an unknown/expired/revoked token', async () => {
      repository.findSessionByTokenHash.mockResolvedValue(null);
      await expect(service.refresh('nope', {})).rejects.toBeInstanceOf(UnauthorizedException);

      repository.findSessionByTokenHash.mockResolvedValue({
        ...session,
        expiresAt: new Date(Date.now() - 60_000),
      } as any);
      await expect(service.refresh('old', {})).rejects.toBeInstanceOf(UnauthorizedException);

      repository.findSessionByTokenHash.mockResolvedValue({
        ...session,
        revokedAt: new Date(),
      } as any);
      await expect(service.refresh('old', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Forbidden for a suspended account', async () => {
      repository.findSessionByTokenHash.mockResolvedValue({
        ...session,
        user: mockUser({ isActive: false }),
      } as any);
      const err = await service.refresh('old', {}).catch((e) => e);
      expect(err.response.code).toBe('USER_SUSPENDED');
    });

    it('throws Conflict when rotation fails (token reuse race)', async () => {
      repository.findSessionByTokenHash.mockResolvedValue(session as any);
      repository.rotateSession.mockResolvedValue(false);
      const err = await service.refresh('old', {}).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.response.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');
    });
  });

  describe('logout', () => {
    it('revokes the session by refresh token hash', async () => {
      repository.revokeSessionByHash.mockResolvedValue(true);
      await service.logout('raw-token');
      expect(repository.revokeSessionByHash).toHaveBeenCalledWith(
        'sha256:raw-token',
        expect.any(Date),
      );
    });
  });

  describe('verifyEmail', () => {
    it('consumes the token and verifies the user', async () => {
      repository.findVerificationTokenByHash.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      } as any);
      const result = await service.verifyEmail('token');
      expect(result.verified).toBe(true);
      expect(repository.consumeVerificationToken).toHaveBeenCalledWith(
        'vt-1',
        'user-1',
        expect.any(Date),
      );
    });

    it('rejects invalid/expired/used tokens', async () => {
      repository.findVerificationTokenByHash.mockResolvedValue(null);
      await expect(service.verifyEmail('token')).rejects.toMatchObject({
        response: { code: 'INVALID_OR_EXPIRED_TOKEN' },
      });

      repository.findVerificationTokenByHash.mockResolvedValue({
        id: 'vt-1',
        userId: 'u1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      } as any);
      await expect(service.verifyEmail('token')).rejects.toMatchObject({
        response: { code: 'INVALID_OR_EXPIRED_TOKEN' },
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('is silent for unknown users', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(service.resendVerificationEmail('x@y.com')).resolves.toEqual({ sent: true });
    });

    it('is silent for already-verified users', async () => {
      repository.findByEmail.mockResolvedValue(mockUser());
      await expect(service.resendVerificationEmail('x@y.com')).resolves.toEqual({ sent: true });
    });

    it('invalidates old tokens and resends for unverified users', async () => {
      repository.findByEmail.mockResolvedValue(mockUser({ emailVerifiedAt: null }));
      await service.resendVerificationEmail('x@y.com');
      expect(repository.invalidateVerificationTokens).toHaveBeenCalled();
      expect(mailer.send).toHaveBeenCalled();
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('is silent for unknown emails', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('x@y.com')).resolves.toEqual({ sent: true });
    });

    it('creates a reset token and emails it', async () => {
      repository.findByEmail.mockResolvedValue(mockUser());
      await service.forgotPassword('x@y.com');
      expect(repository.createPasswordResetToken).toHaveBeenCalled();
      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'password-reset' }),
      );
    });

    it('resets the password and revokes all sessions', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      } as any);
      const result = await service.resetPassword('token', 'NewPassword1');
      expect(result.reset).toBe(true);
      expect(repository.setUserPassword).toHaveBeenCalled();
      expect(repository.revokeAllUserSessions).toHaveBeenCalledWith('user-1', expect.any(Date));
    });

    it('rejects an invalid reset token', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue(null);
      await expect(service.resetPassword('token', 'NewPassword1')).rejects.toMatchObject({
        response: { code: 'INVALID_OR_EXPIRED_TOKEN' },
      });
    });
  });
});
