import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { mockUser } from '../testing/mocks';

describe('AdminService', () => {
  let repository: jest.Mocked<Pick<AdminRepository, keyof AdminRepository>>;
  let audit: jest.Mocked<AuditService>;
  let service: AdminService;

  beforeEach(() => {
    repository = {
      findUserById: jest.fn(),
      updateUserStatus: jest.fn(),
      listRoles: jest.fn(),
      countRoles: jest.fn(),
      findRoleById: jest.fn(),
      findRoleByName: jest.fn(),
      findPermissionsByNames: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
    } as unknown as jest.Mocked<AdminRepository>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new AdminService(repository as unknown as AdminRepository, audit);
  });

  describe('suspendUser', () => {
    it('suspends an active user and records an audit trail', async () => {
      repository.findUserById.mockResolvedValue(mockUser());
      repository.updateUserStatus.mockResolvedValue({
        ...mockUser(),
        isActive: false,
        suspendedAt: new Date(),
      });
      await service.suspendUser('admin-1', 'user-1', { reason: 'spam' }, '1.2.3.4');
      expect(repository.updateUserStatus).toHaveBeenCalledWith('user-1', {
        isActive: false,
        suspendedAt: expect.any(Date),
        suspendReason: 'spam',
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.user.suspend',
          userId: 'admin-1',
          entityId: 'user-1',
        }),
      );
    });

    it('throws NotFound for an unknown user', async () => {
      repository.findUserById.mockResolvedValue(null);
      await expect(service.suspendUser('a', 'u', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Conflict when already suspended', async () => {
      repository.findUserById.mockResolvedValue(mockUser({ isActive: false }));
      await expect(service.suspendUser('a', 'u', {})).rejects.toMatchObject({
        response: { code: 'USER_ALREADY_SUSPENDED' },
      });
    });

    it('stores a null suspend reason when none is given', async () => {
      repository.findUserById.mockResolvedValue(mockUser());
      repository.updateUserStatus.mockResolvedValue({
        ...mockUser(),
        isActive: false,
        suspendedAt: new Date(),
      });
      await service.suspendUser('a', 'u', {});
      expect(repository.updateUserStatus).toHaveBeenCalledWith(
        'u',
        expect.objectContaining({ suspendReason: null }),
      );
    });
  });

  describe('reactivateUser', () => {
    it('reactivates a suspended user and records an audit trail', async () => {
      repository.findUserById.mockResolvedValue(mockUser({ isActive: false }));
      repository.updateUserStatus.mockResolvedValue(mockUser());
      await service.reactivateUser('admin-1', 'user-1');
      expect(repository.updateUserStatus).toHaveBeenCalledWith('user-1', {
        isActive: true,
        suspendedAt: null,
        suspendReason: null,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.user.reactivate', userId: 'admin-1' }),
      );
    });

    it('throws Conflict when the user is not suspended', async () => {
      repository.findUserById.mockResolvedValue(mockUser());
      await expect(service.reactivateUser('a', 'u')).rejects.toMatchObject({
        response: { code: 'USER_NOT_SUSPENDED' },
      });
    });

    it('handles reactivation of a user without a suspend timestamp', async () => {
      repository.findUserById.mockResolvedValue(mockUser({ isActive: false, suspendedAt: null }));
      repository.updateUserStatus.mockResolvedValue(mockUser());
      await service.reactivateUser('a', 'u');
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('roles', () => {
    const role = (overrides: Record<string, unknown> = {}) => ({
      id: 'role-x',
      name: 'intern',
      description: 'An intern',
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [{ name: 'read:self' }],
      ...overrides,
    });

    it('lists roles with pagination meta', async () => {
      repository.countRoles.mockResolvedValue(1);
      repository.listRoles.mockResolvedValue([role()]);
      const result = await service.listRoles(1, 20);
      expect(result.data[0].name).toBe('intern');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('creates a role and records an audit trail', async () => {
      repository.findRoleByName.mockResolvedValue(null);
      repository.findPermissionsByNames.mockResolvedValue([{ id: 'p1', name: 'read:self' }] as any);
      repository.createRole.mockResolvedValue(role({ permissions: [{ name: 'read:self' }] }));
      const result = await service.createRole('admin-1', {
        name: '  intern  ',
        description: 'An intern',
        permissions: ['read:self'],
      });
      expect(repository.createRole).toHaveBeenCalledWith({
        name: 'intern',
        description: 'An intern',
        permissionIds: ['p1'],
      });
      expect(result.name).toBe('intern');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.role.create' }),
      );
    });

    it('throws Conflict when the role name already exists', async () => {
      repository.findRoleByName.mockResolvedValue(role());
      await expect(service.createRole('a', { name: 'intern' })).rejects.toMatchObject({
        response: { code: 'ROLE_ALREADY_EXISTS' },
      });
    });

    it('throws BadRequest for unknown permissions', async () => {
      repository.findRoleByName.mockResolvedValue(null);
      repository.findPermissionsByNames.mockResolvedValue([{ id: 'p1', name: 'read:self' }] as any);
      await expect(
        service.createRole('a', { name: 'r', permissions: ['nope'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a role with no permissions', async () => {
      repository.findRoleByName.mockResolvedValue(null);
      repository.createRole.mockResolvedValue(role({ permissions: [] }));
      await service.createRole('a', { name: 'intern' });
      expect(repository.createRole).toHaveBeenCalledWith({
        name: 'intern',
        description: undefined,
        permissionIds: [],
      });
    });

    it('updates a role and records an audit trail', async () => {
      repository.findRoleById.mockResolvedValue(role());
      repository.findRoleByName.mockResolvedValue(null);
      repository.findPermissionsByNames.mockResolvedValue([{ id: 'p1', name: 'read:self' }] as any);
      repository.updateRole.mockResolvedValue(role({ name: 'intern-v2' }));
      const result = await service.updateRole('admin-1', 'role-x', {
        name: 'intern-v2',
        permissions: ['read:self'],
      });
      expect(result.name).toBe('intern-v2');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.role.update' }),
      );
    });

    it('throws NotFound when updating a missing role', async () => {
      repository.findRoleById.mockResolvedValue(null);
      await expect(service.updateRole('a', 'r', { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates a role with only a description (no name or permissions)', async () => {
      repository.findRoleById.mockResolvedValue(role({ description: null }));
      repository.updateRole.mockResolvedValue(role({ description: 'Renamed' }));
      await service.updateRole('a', 'role-x', { description: 'Renamed' });
      expect(repository.updateRole).toHaveBeenCalledWith('role-x', {
        name: undefined,
        description: 'Renamed',
        permissionIds: undefined,
      });
    });

    it('lists roles with a null description mapping', async () => {
      repository.countRoles.mockResolvedValue(1);
      repository.listRoles.mockResolvedValue([role({ description: null })]);
      const result = await service.listRoles(1, 20, 'search');
      expect(result.data[0].description).toBeUndefined();
      expect(repository.countRoles).toHaveBeenCalledWith('search');
    });
  });
});
