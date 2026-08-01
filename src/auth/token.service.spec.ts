import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { mockConfig } from '../testing/mocks';

describe('TokenService', () => {
  let jwt: jest.Mocked<JwtService>;
  let service: TokenService;

  beforeEach(() => {
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed'),
    } as unknown as jest.Mocked<JwtService>;
    service = new TokenService(jwt, mockConfig());
  });

  it('generates opaque base64url refresh tokens', () => {
    const token = service.generateRefreshToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(60);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes tokens with sha256 hex', () => {
    const hash = service.hashToken('raw-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashToken('raw-token')).toBe(hash);
    expect(service.hashToken('raw-token')).not.toBe(service.hashToken('raw-token-2'));
  });

  it('signs access tokens with the configured secret/ttl/issuer/audience', async () => {
    await service.signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'student', sid: 's1' });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'u1', email: 'a@b.com', role: 'student', sid: 's1' },
      expect.objectContaining({
        secret: 'test-access-secret-0123456789abcdefghijklmnop',
        expiresIn: 900,
        issuer: 'issuer',
        audience: 'audience',
      }),
    );
  });

  it('returns the access token TTL from config', () => {
    expect(service.accessTokenExpirySeconds()).toBe(900);
  });
});
