import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let prisma: { auditLog: { create: jest.Mock } };
  let service: AuditService;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  it('persists a full audit entry', async () => {
    await service.record({
      userId: 'u1',
      action: 'admin.user.suspend',
      entityType: 'user',
      entityId: 'u2',
      before: { isActive: true },
      after: { isActive: false },
      ip: '1.2.3.4',
    });
    const arg = prisma.auditLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({
      userId: 'u1',
      action: 'admin.user.suspend',
      entityType: 'user',
      entityId: 'u2',
      before: { isActive: true },
      after: { isActive: false },
      ip: '1.2.3.4',
    });
  });

  it('stores missing optional values as JsonNull', async () => {
    await service.record({ action: 'thing.happened', entityType: 'thing' });
    const arg = prisma.auditLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.userId).toBeNull();
    expect(arg.data.before).toBe(Prisma.JsonNull);
    expect(arg.data.after).toBe(Prisma.JsonNull);
    expect(arg.data.metadata).toBe(Prisma.JsonNull);
  });

  it('stores metadata alongside a request', async () => {
    await service.record({
      action: 'thing.happened',
      entityType: 'thing',
      metadata: { body: { a: 1 } },
    });
    const arg = prisma.auditLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.metadata).toEqual({ body: { a: 1 } });
  });
});
