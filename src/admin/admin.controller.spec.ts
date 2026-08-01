import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';

describe('AdminController', () => {
  const admin = {
    suspendUser: jest.fn(),
    reactivateUser: jest.fn(),
    listRoles: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
  };
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController(admin as unknown as AdminService);
  });

  it('suspends a user with context', () => {
    controller.suspendUser({ id: 'admin' } as any, 'u1', { reason: 'spam' }, '1.1.1.1');
    expect(admin.suspendUser).toHaveBeenCalledWith('admin', 'u1', { reason: 'spam' }, '1.1.1.1');
  });

  it('reactivates a user', () => {
    controller.reactivateUser({ id: 'admin' } as any, 'u1', '1.1.1.1');
    expect(admin.reactivateUser).toHaveBeenCalledWith('admin', 'u1', '1.1.1.1');
  });

  it('lists roles with the query', () => {
    controller.listRoles(Object.assign(new PaginationQueryDto(), { page: 1, limit: 20 }));
    expect(admin.listRoles).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('creates and updates roles', () => {
    controller.createRole({ id: 'admin' } as any, { name: 'intern' }, '1.1.1.1');
    expect(admin.createRole).toHaveBeenCalled();
    controller.updateRole({ id: 'admin' } as any, 'r1', { name: 'intern-v2' }, '1.1.1.1');
    expect(admin.updateRole).toHaveBeenCalledWith('admin', 'r1', { name: 'intern-v2' }, '1.1.1.1');
  });
});
