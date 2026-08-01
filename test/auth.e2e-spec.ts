import { INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { authenticator } from 'otplib';
import passport from 'passport';
import { Strategy } from 'passport-strategy';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory } from './support/factories';
import { TEST_PASSWORD } from './support/factories';
import { OAuthService } from '../src/auth/oauth.service';

class FakeGoogleStrategy extends Strategy {
  name = 'google';

  constructor(private readonly oauth: OAuthService) {
    super();
  }

  authenticate(): void {
    this.oauth
      .authenticate({
        provider: 'google',
        providerAccountId: 'google-account-1',
        email: 'oauth-google@example.com',
        displayName: 'Google User',
      })
      .then((result) => this.success(result))
      .catch((err) => this.error(err as Error));
  }
}

const API = '/api/v1';

describe('Auth & Identity (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let app: INestApplication;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    app = testApp.app;
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const register = (email: string, password = TEST_PASSWORD, fullName = 'Test User') =>
    request.post(`${API}/auth/register`).send({ email, password, fullName });

  describe('POST /auth/register', () => {
    it('registers a student and sends a verification email', async () => {
      const email = faker.internet.email().toLowerCase();
      const res = await register(email).expect(201);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.emailVerified).toBe(false);
      expect(res.body.verificationRequired).toBe(true);
      const mail = testApp.mailer.last('email-verification');
      expect(mail).toBeDefined();
      expect(mail!.to).toBe(email);
    });

    it('rejects a duplicate email with 409', async () => {
      const email = faker.internet.email().toLowerCase();
      await register(email).expect(201);
      const res = await register(email).expect(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('returns 400 for an invalid payload', async () => {
      await request
        .post(`${API}/auth/register`)
        .send({ email: 'not-an-email', password: 'short', fullName: '' })
        .expect(400);
    });

    it('forbids non-whitelisted fields (400)', async () => {
      await request
        .post(`${API}/auth/register`)
        .send({
          email: faker.internet.email(),
          password: TEST_PASSWORD,
          fullName: 'X',
          role: 'admin',
        })
        .expect(400);
    });
  });

  describe('email verification', () => {
    it('verifies a valid emailed token', async () => {
      const email = faker.internet.email().toLowerCase();
      await register(email).expect(201);
      const token = testApp.mailer.extractToken('email-verification', 'token');
      await request.get(`${API}/auth/verify-email/${token}`).expect(200);
    });

    it('rejects an invalid token with 400', async () => {
      await request.get(`${API}/auth/verify-email/not-a-real-token`).expect(400);
    });

    it('rejects a reused token with 400', async () => {
      const email = faker.internet.email().toLowerCase();
      await register(email).expect(201);
      const token = testApp.mailer.extractToken('email-verification', 'token');
      await request.get(`${API}/auth/verify-email/${token}`).expect(200);
      await request.get(`${API}/auth/verify-email/${token}`).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('forbids login before email verification (403 EMAIL_NOT_VERIFIED)', async () => {
      const email = faker.internet.email().toLowerCase();
      await register(email).expect(201);
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects a wrong password with 401', async () => {
      const { email } = await factory.createUser({ emailVerified: false });
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email, password: 'WrongPass1' })
        .expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown email with 401 (no user enumeration)', async () => {
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email: 'nobody@xkill.test', password: TEST_PASSWORD })
        .expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns tokens + user for valid credentials', async () => {
      const { email } = await factory.createUser();
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.accessTokenExpiresIn).toBeGreaterThan(0);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.emailVerified).toBe(true);
    });

    it('forbids a suspended user (403 USER_SUSPENDED)', async () => {
      const { email } = await factory.createUser({ isActive: false });
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(403);
      expect(res.body.code).toBe('USER_SUSPENDED');
    });
  });

  describe('protected routes / token validation', () => {
    let tokens: { accessToken: string };
    let user: Awaited<ReturnType<TestDataFactory['createUser']>>;

    beforeAll(async () => {
      user = await factory.createUser();
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      tokens = res.body;
    });

    it('rejects requests without a token (401)', async () => {
      await request.get(`${API}/users/me/sessions`).expect(401);
    });

    it('rejects a tampered token (401)', async () => {
      await request
        .get(`${API}/users/me/sessions`)
        .set('Authorization', `Bearer ${tokens.accessToken}xxxx`)
        .expect(401);
    });

    it('rejects an expired token (401)', async () => {
      const expired = jwt.sign(
        { sub: user.id, email: user.email, role: 'student' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: -10, issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE },
      );
      await request
        .get(`${API}/users/me/sessions`)
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
    });

    it('allows an authenticated request', async () => {
      const res = await request
        .get(`${API}/users/me/sessions`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('rotates tokens and rejects the now-rotated token (401)', async () => {
      const { email } = await factory.createUser();
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(200);
      const first = login.body.refreshToken;

      const refreshed = await request
        .post(`${API}/auth/refresh-token`)
        .send({ refreshToken: first })
        .expect(200);
      expect(refreshed.body.accessToken).toBeTruthy();
      expect(refreshed.body.refreshToken).not.toBe(first);

      const reuse = await request
        .post(`${API}/auth/refresh-token`)
        .send({ refreshToken: first })
        .expect(401);
      expect(reuse.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects a garbage refresh token (401)', async () => {
      await request
        .post(`${API}/auth/refresh-token`)
        .send({ refreshToken: 'totally-bogus-token' })
        .expect(401);
    });

    it('handles a concurrent refresh race: one succeeds, one 409', async () => {
      const { email } = await factory.createUser();
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(200);
      const token = login.body.refreshToken;

      const [a, b] = await Promise.all([
        request.post(`${API}/auth/refresh-token`).send({ refreshToken: token }),
        request.post(`${API}/auth/refresh-token`).send({ refreshToken: token }),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  describe('two-factor authentication', () => {
    let user: Awaited<ReturnType<TestDataFactory['createUser']>>;
    let accessToken: string;
    let secret: string;

    beforeAll(async () => {
      user = await factory.createUser();
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      accessToken = login.body.accessToken;
    });

    it('sets up 2FA and returns a secret + QR', async () => {
      const res = await request
        .post(`${API}/auth/2fa/setup`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.secret).toBeTruthy();
      expect(res.body.otpauthUrl).toContain('otpauth://');
      expect(res.body.qrCodeDataUrl).toContain('data:image/png;base64,');
      secret = res.body.secret;
    });

    it('enables 2FA after verifying a valid code', async () => {
      const code = authenticator.generate(secret);
      const res = await request
        .post(`${API}/auth/2fa/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totpCode: code })
        .expect(200);
      expect(res.body.enabled).toBe(true);
    });

    it('refuses a second setup once enabled (409)', async () => {
      await request
        .post(`${API}/auth/2fa/setup`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });

    it('requires the TOTP code at login (400)', async () => {
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(400);
      expect(res.body.code).toBe('TWO_FACTOR_REQUIRED');
    });

    it('rejects a wrong TOTP code (401)', async () => {
      await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD, totpCode: '000000' })
        .expect(401);
    });

    it('logs in with a valid TOTP code', async () => {
      const code = authenticator.generate(secret);
      const res = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD, totpCode: code })
        .expect(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it('disables 2FA with a valid code', async () => {
      const code = authenticator.generate(secret);
      const res = await request
        .post(`${API}/auth/2fa/disable`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totpCode: code })
        .expect(200);
      expect(res.body.enabled).toBe(false);
      await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
    });
  });

  describe('forgot / reset password', () => {
    it('always answers 200 to forgot-password (no user enumeration)', async () => {
      await request
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'ghost@xkill.test' })
        .expect(200);
    });

    it('sends a reset email for a known user', async () => {
      const { email } = await factory.createUser();
      const res = await request.post(`${API}/auth/forgot-password`).send({ email }).expect(200);
      expect(res.body.sent).toBe(true);
      expect(testApp.mailer.last('password-reset')).toBeDefined();
    });

    it('resets the password and revokes all sessions', async () => {
      const { email } = await factory.createUser();
      await request.post(`${API}/auth/forgot-password`).send({ email }).expect(200);
      const token = testApp.mailer.extractToken('password-reset', 'token');

      const reset = await request
        .post(`${API}/auth/reset-password`)
        .send({ token, newPassword: 'NewPassword1' })
        .expect(200);
      expect(reset.body.reset).toBe(true);

      await request.post(`${API}/auth/login`).send({ email, password: TEST_PASSWORD }).expect(401);
      await request.post(`${API}/auth/login`).send({ email, password: 'NewPassword1' }).expect(200);
    });

    it('rejects reuse of a reset token (400)', async () => {
      const { email } = await factory.createUser();
      await request.post(`${API}/auth/forgot-password`).send({ email }).expect(200);
      const token = testApp.mailer.extractToken('password-reset', 'token');
      await request
        .post(`${API}/auth/reset-password`)
        .send({ token, newPassword: 'NewPassword1' })
        .expect(200);
      const reuse = await request
        .post(`${API}/auth/reset-password`)
        .send({ token, newPassword: 'NewPassword1' })
        .expect(400);
      expect(reuse.body.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('rejects a bogus reset token (400)', async () => {
      await request
        .post(`${API}/auth/reset-password`)
        .send({ token: 'bogus', newPassword: 'NewPassword1' })
        .expect(400);
    });
  });

  describe('resend verification email', () => {
    it('resends for an unverified user and the new token works', async () => {
      const { email } = await factory.createUser({ emailVerified: false });
      await request.post(`${API}/auth/resend-verification-email`).send({ email }).expect(200);
      const token = testApp.mailer.extractToken('email-verification', 'token');
      await request.get(`${API}/auth/verify-email/${token}`).expect(200);
    });

    it('is idempotent for unknown / already-verified emails', async () => {
      const { email } = await factory.createUser();
      const res = await request
        .post(`${API}/auth/resend-verification-email`)
        .send({ email })
        .expect(200);
      expect(res.body.sent).toBe(true);
      await request
        .post(`${API}/auth/resend-verification-email`)
        .send({ email: 'nope@xkill.test' })
        .expect(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session so its refresh token is rejected', async () => {
      const { email } = await factory.createUser();
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email, password: TEST_PASSWORD })
        .expect(200);
      const refreshToken = login.body.refreshToken;

      await request.post(`${API}/auth/logout`).send({ refreshToken }).expect(204);
      await request.post(`${API}/auth/refresh-token`).send({ refreshToken }).expect(401);
    });
  });

  describe('OAuth', () => {
    it('rejects an unsupported provider (400)', async () => {
      const res = await request.get(`${API}/auth/oauth/bitbucket`).expect(400);
      expect(res.body.code).toBe('UNSUPPORTED_OAUTH_PROVIDER');
    });

    it('returns 503 when a provider is not configured', async () => {
      const res = await request.get(`${API}/auth/oauth/google`).expect(503);
      expect(res.body.code).toBe('OAUTH_NOT_CONFIGURED');
    });

    it('completes a mocked Google OAuth callback and logs the user in', async () => {
      passport.use('google', new FakeGoogleStrategy(app.get(OAuthService)));

      const res = await request.get(`${API}/auth/oauth/google/callback`).expect(302);
      const location = res.headers.location as string;
      expect(location).toContain('/oauth/callback?');

      const parsed = new URL(location);
      const accessToken = parsed.searchParams.get('accessToken');
      const refreshToken = parsed.searchParams.get('refreshToken');
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();

      const meRes = await request
        .get(`${API}/users/me/sessions`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.meta.total).toBeGreaterThanOrEqual(1);

      const account = await db.prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: { provider: 'google', providerAccountId: 'google-account-1' },
        },
        include: { user: true },
      });
      expect(account?.user.email).toBe('oauth-google@example.com');
      expect(account?.user.emailVerifiedAt).not.toBeNull();
    });
  });
});
