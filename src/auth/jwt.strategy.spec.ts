import { UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './jwt.strategy';
import { mockConfig } from '../testing/mocks';

describe('JwtStrategy', () => {
  let repository: jest.Mocked<Pick<AuthRepository, keyof AuthRepository>>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    repository = { findByIdActive: jest.fn() } as unknown as jest.Mocked<AuthRepository>;
    strategy = new JwtStrategy(mockConfig(), repository as unknown as AuthRepository);
  });

  it('resolves an active user to an AuthenticatedUser', async () => {
    repository.findByIdActive.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      roleId: 'r1',
      role: { name: 'student', permissions: [{ name: 'read:self' }] },
    } as any);
    const result = await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      role: 'student',
      sid: 's1',
    });
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      role: 'student',
      roleId: 'r1',
      sessionId: 's1',
      permissions: [{ name: 'read:self' }],
    });
  });

  it('rejects tokens for missing/suspended users', async () => {
    repository.findByIdActive.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'u1', email: 'a', role: 'student' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
