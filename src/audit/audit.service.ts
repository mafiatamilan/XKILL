import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before:
          entry.before === undefined ? Prisma.JsonNull : (entry.before as Prisma.InputJsonValue),
        after: entry.after === undefined ? Prisma.JsonNull : (entry.after as Prisma.InputJsonValue),
        metadata:
          entry.metadata === undefined
            ? Prisma.JsonNull
            : (entry.metadata as Prisma.InputJsonValue),
        ip: entry.ip ?? null,
      },
    });
  }
}
