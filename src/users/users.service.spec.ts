import { AuthRepository } from '../auth/auth.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let authRepository: jest.Mocked<Pick<AuthRepository, keyof AuthRepository>>;
  let service: UsersService;

  beforeEach(() => {
    authRepository = {
      countUserSessions: jest.fn(),
      listUserSessions: jest.fn(),
      revokeUserSession: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    service = new UsersService(authRepository as unknown as AuthRepository);
  });

  it('maps sessions to DTOs with pagination meta and current flag', async () => {
    const now = new Date();
    authRepository.countUserSessions.mockResolvedValue(1);
    authRepository.listUserSessions.mockResolvedValue([
      {
        id: 's1',
        ip: '1.2.3.4',
        userAgent: 'ua',
        issuedAt: now,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
        device: { name: 'Chrome', platform: 'web', browser: 'Chrome', os: 'Linux' },
      },
    ] as any);

    const result = await service.listSessions('u1', 's1', 1, 20);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.data[0]).toMatchObject({ id: 's1', current: true, device: { name: 'Chrome' } });
    expect(authRepository.listUserSessions).toHaveBeenCalledWith('u1', 0, 20);
  });

  it('handles sessions without device info', async () => {
    authRepository.countUserSessions.mockResolvedValue(1);
    authRepository.listUserSessions.mockResolvedValue([
      {
        id: 's1',
        issuedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(),
        device: null,
      },
    ] as any);
    const result = await service.listSessions('u1', undefined, 1, 20);
    expect(result.data[0].device).toEqual({});
    expect(result.data[0].current).toBe(false);
  });

  it('revokes a session owned by the user', async () => {
    authRepository.revokeUserSession.mockResolvedValue(true);
    await service.revokeSession('u1', 's1');
    expect(authRepository.revokeUserSession).toHaveBeenCalledWith('s1', 'u1', expect.any(Date));
  });

  it('throws NotFound when revoking a session of another user', async () => {
    authRepository.revokeUserSession.mockResolvedValue(false);
    await expect(service.revokeSession('u1', 's1')).rejects.toMatchObject({
      response: { code: 'SESSION_NOT_FOUND' },
    });
  });
});
