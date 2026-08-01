import { PrismaService } from '../prisma/prisma.service';
import { AdminRepository } from './admin.repository';

interface PrismaMock {
  user: { findUnique: jest.Mock; update: jest.Mock };
  role: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  permission: { findMany: jest.Mock };
}

function mockPrisma(): PrismaMock {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    permission: { findMany: jest.fn() },
  };
}

describe('AdminRepository', () => {
  let prisma: PrismaMock;
  let repository: AdminRepository;

  beforeEach(() => {
    prisma = mockPrisma();
    repository = new AdminRepository(prisma as unknown as PrismaService);
  });

  it('looks up a user with role for status updates', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: { name: 'student' } });
    await repository.findUserById('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      include: { role: true },
    });
  });

  it('updates a user status including suspend reason', async () => {
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    await repository.updateUserStatus('u1', {
      isActive: false,
      suspendedAt: new Date(),
      suspendReason: 'spam',
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ isActive: false, suspendReason: 'spam' }),
      }),
    );
  });

  it('filters role listing by search term', async () => {
    prisma.role.findMany.mockResolvedValue([]);
    await repository.listRoles({ skip: 0, take: 20, search: 'student' });
    expect(prisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: 'student' }) }),
          ]),
        }),
      }),
    );
  });

  it('counts roles without a filter when no search term is given', async () => {
    prisma.role.count.mockResolvedValue(3);
    await expect(repository.countRoles()).resolves.toBe(3);
    expect(prisma.role.count).toHaveBeenCalledWith({ where: {} });
  });

  it('counts roles with a search filter', async () => {
    prisma.role.count.mockResolvedValue(1);
    await expect(repository.countRoles('admin')).resolves.toBe(1);
    expect(prisma.role.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: expect.arrayContaining([]) } }),
    );
  });

  it('lists roles without a search term', async () => {
    prisma.role.findMany.mockResolvedValue([]);
    await repository.listRoles({ skip: 0, take: 20 });
    expect(prisma.role.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('creates a role connecting the resolved permissions', async () => {
    prisma.role.create.mockResolvedValue({ id: 'r1' });
    await repository.createRole({ name: 'intern', description: 'd', permissionIds: ['p1', 'p2'] });
    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'intern',
          description: 'd',
          isSystem: false,
          permissions: { connect: [{ id: 'p1' }, { id: 'p2' }] },
        },
      }),
    );
  });

  it('updates only the fields supplied', async () => {
    prisma.role.update.mockResolvedValue({ id: 'r1' });
    await repository.updateRole('r1', { name: 'x' });
    const arg = prisma.role.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).toEqual({ name: 'x' });
    expect(arg.data).not.toHaveProperty('description');
  });

  it('updates description and permissions together', async () => {
    prisma.role.update.mockResolvedValue({ id: 'r1' });
    await repository.updateRole('r1', { description: 'd', permissionIds: ['p1'] });
    const arg = prisma.role.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).toEqual({ description: 'd', permissions: { set: [{ id: 'p1' }] } });
  });
});
