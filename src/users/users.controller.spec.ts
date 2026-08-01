import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';

describe('UsersController', () => {
  const users = { listSessions: jest.fn(), revokeSession: jest.fn() };
  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(users as unknown as UsersService);
  });

  it('lists the current user sessions with pagination', () => {
    const user = { id: 'u1', sessionId: 's1' } as any;
    const query = Object.assign(new PaginationQueryDto(), { page: 2, limit: 10 });
    controller.listSessions(user, query);
    expect(users.listSessions).toHaveBeenCalledWith('u1', 's1', 2, 10);
  });

  it('revokes a session', async () => {
    const user = { id: 'u1' } as any;
    await controller.revokeSession(user, 's1');
    expect(users.revokeSession).toHaveBeenCalledWith('u1', 's1');
  });
});
