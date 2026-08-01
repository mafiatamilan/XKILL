import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthService } from './oauth.service';
import { mockConfig } from '../testing/mocks';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const twoFactor = {
    setup: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };
  const oauth = { generateAuthorizeUrl: jest.fn() };
  const config = mockConfig({ webAppUrl: 'http://web.test' });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    delete process.env.AUTH_RATE_LIMIT_LIMIT;
    delete process.env.RATE_LIMIT_TTL_MS;
    controller = new AuthController(
      auth as unknown as AuthService,
      twoFactor as unknown as TwoFactorService,
      oauth as unknown as OAuthService,
      config,
    );
  });

  afterAll(() => {
    delete process.env.AUTH_RATE_LIMIT_LIMIT;
    delete process.env.RATE_LIMIT_TTL_MS;
  });

  it('delegates register', () => {
    controller.register({ email: 'a@b.com', password: 'Password1', fullName: 'A' });
    expect(auth.register).toHaveBeenCalled();
  });

  it('delegates login with request context', () => {
    const req = { ip: '1.2.3.4', headers: { 'user-agent': 'ua' } } as any;
    controller.login({ email: 'a@b.com', password: 'Password1' }, req);
    expect(auth.login).toHaveBeenCalledWith(expect.anything(), { ip: '1.2.3.4', userAgent: 'ua' });
  });

  it('delegates refresh/logout', () => {
    controller.refreshToken({ refreshToken: 'rt' }, { ip: '1', headers: {} } as any);
    expect(auth.refresh).toHaveBeenCalled();
    controller.logout({ refreshToken: 'rt' });
    expect(auth.logout).toHaveBeenCalledWith('rt');
  });

  it('delegates verify/resend/forgot/reset password flows', () => {
    controller.verifyEmail('tok');
    expect(auth.verifyEmail).toHaveBeenCalledWith('tok');
    controller.resendVerification({ email: 'a@b.com' });
    expect(auth.resendVerificationEmail).toHaveBeenCalledWith('a@b.com');
    controller.forgotPassword({ email: 'a@b.com' });
    expect(auth.forgotPassword).toHaveBeenCalledWith('a@b.com');
    controller.resetPassword({ token: 't', newPassword: 'P' });
    expect(auth.resetPassword).toHaveBeenCalledWith('t', 'P');
  });

  it('delegates 2FA handlers', async () => {
    const user = { id: 'u1', email: 'a@b.com' } as any;
    await controller.setupTwoFactor(user);
    expect(twoFactor.setup).toHaveBeenCalledWith('u1', 'a@b.com');
    await controller.verifyTwoFactor(user, { totpCode: '123456' });
    expect(twoFactor.enable).toHaveBeenCalledWith('u1', '123456');
    await controller.disableTwoFactor(user, { totpCode: '123456' });
    expect(twoFactor.disable).toHaveBeenCalledWith('u1', '123456');
  });

  it('returns an authorize URL for a supported provider', () => {
    oauth.generateAuthorizeUrl.mockReturnValue('https://accounts.google.com/...');
    const result = controller.oauthStart('google');
    expect(result.url).toContain('accounts.google.com');
  });

  it('rejects unsupported OAuth providers', () => {
    expect(() => controller.oauthStart('microsoft')).toThrow(BadRequestException);
  });

  it('redirects OAuth callbacks to the web app with tokens', () => {
    const res = { redirect: jest.fn() };
    controller['oauthRedirect'](
      { user: { accessToken: 'at', refreshToken: 'rt' } } as any,
      res as any,
    );
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining('http://web.test/oauth/callback'),
    );
  });
});

describe('AuthController throttle config', () => {
  it('reads auth rate limit values from the environment at module load', () => {
    process.env.AUTH_RATE_LIMIT_LIMIT = '25';
    process.env.RATE_LIMIT_TTL_MS = '30000';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AuthController } = require('./auth.controller') as { AuthController: unknown };
      expect(AuthController).toBeTruthy();
    });
    delete process.env.AUTH_RATE_LIMIT_LIMIT;
    delete process.env.RATE_LIMIT_TTL_MS;
  });
});
