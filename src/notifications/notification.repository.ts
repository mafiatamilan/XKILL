import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Notification CRUD ──────────────────────────────────────────────────

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async listNotifications(params: {
    userId: string;
    skip: number;
    take: number;
    unreadOnly?: boolean;
  }) {
    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  async countNotifications(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.count({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
    });
  }

  async findNotificationById(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markNotificationRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async createManyNotifications(
    data: Array<{
      userId: string;
      type: string;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    return this.prisma.notification.createMany({
      data: data.map((d) => ({
        ...d,
        metadata: d.metadata ? (d.metadata as Prisma.InputJsonValue) : undefined,
      })),
    });
  }

  // ── NotificationTemplate CRUD ──────────────────────────────────────────

  async createTemplate(data: {
    name: string;
    channel: string;
    eventType: string;
    subject?: string;
    body: string;
  }) {
    return this.prisma.notificationTemplate.create({ data });
  }

  async findTemplateById(id: string) {
    return this.prisma.notificationTemplate.findUnique({ where: { id } });
  }

  async findTemplateByName(name: string) {
    return this.prisma.notificationTemplate.findUnique({ where: { name } });
  }

  async listTemplates(params: {
    skip: number;
    take: number;
    channel?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.NotificationTemplateWhereInput = {
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    };

    return this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  async countTemplates(channel?: string, isActive?: boolean) {
    return this.prisma.notificationTemplate.count({
      where: {
        ...(channel ? { channel } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      channel?: string;
      eventType?: string;
      subject?: string;
      body?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    return this.prisma.notificationTemplate.delete({ where: { id } });
  }

  // ── Announcement CRUD ──────────────────────────────────────────────────

  async createAnnouncement(data: {
    authorId: string;
    title: string;
    content: string;
    type?: string;
    priority?: string;
    targetRoles?: string[];
    isPublished?: boolean;
    publishedAt?: Date;
    expiresAt?: Date;
  }) {
    return this.prisma.announcement.create({ data });
  }

  async findAnnouncementById(id: string) {
    return this.prisma.announcement.findUnique({ where: { id } });
  }

  async listAnnouncements(params: {
    skip: number;
    take: number;
    type?: string;
    isPublished?: boolean;
    authorId?: string;
  }) {
    const where: Prisma.AnnouncementWhereInput = {
      ...(params.type ? { type: params.type } : {}),
      ...(params.isPublished !== undefined ? { isPublished: params.isPublished } : {}),
      ...(params.authorId ? { authorId: params.authorId } : {}),
    };

    return this.prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  async countAnnouncements(type?: string, isPublished?: boolean, authorId?: string) {
    return this.prisma.announcement.count({
      where: {
        ...(type ? { type } : {}),
        ...(isPublished !== undefined ? { isPublished } : {}),
        ...(authorId ? { authorId } : {}),
      },
    });
  }

  async updateAnnouncement(
    id: string,
    data: {
      title?: string;
      content?: string;
      type?: string;
      priority?: string;
      targetRoles?: string[];
      isPublished?: boolean;
      publishedAt?: Date;
      expiresAt?: Date;
    },
  ) {
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  async findActiveAnnouncementsForRole(roleName: string) {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        isPublished: true,
        publishedAt: { lte: now },
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          {
            OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: roleName } }],
          },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // ── BroadcastMessage CRUD ──────────────────────────────────────────────

  async createBroadcastMessage(data: {
    templateId?: string;
    announcementId?: string;
    channel: string;
    targetUserIds: string[];
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
  }) {
    return this.prisma.broadcastMessage.create({
      data: {
        templateId: data.templateId ?? undefined,
        announcementId: data.announcementId ?? undefined,
        channel: data.channel,
        targetUserIds: data.targetUserIds,
        title: data.title,
        body: data.body,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        status: 'pending',
        totalRecipients: data.targetUserIds.length,
        sentCount: 0,
        failedCount: 0,
        createdBy: data.createdBy,
      },
    });
  }

  async findBroadcastMessageById(id: string) {
    return this.prisma.broadcastMessage.findUnique({ where: { id } });
  }

  async listBroadcastMessages(params: {
    skip: number;
    take: number;
    status?: string;
    createdBy?: string;
  }) {
    const where: Prisma.BroadcastMessageWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.createdBy ? { createdBy: params.createdBy } : {}),
    };

    return this.prisma.broadcastMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  async countBroadcastMessages(status?: string, createdBy?: string) {
    return this.prisma.broadcastMessage.count({
      where: {
        ...(status ? { status } : {}),
        ...(createdBy ? { createdBy } : {}),
      },
    });
  }

  async updateBroadcastMessage(
    id: string,
    data: {
      status?: string;
      sentCount?: number;
      failedCount?: number;
    },
  ) {
    return this.prisma.broadcastMessage.update({ where: { id }, data });
  }

  // ── User queries for fan-out ───────────────────────────────────────────

  async findUserIdsByRole(roleName: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: roleName },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async findUserIdsByRoles(roleNames: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: { in: roleNames } },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async findAllActiveUserIds() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async getUserSettings(userId: string) {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  async findDevicePushTokens(userIds: string[]) {
    const devices = await this.prisma.device.findMany({
      where: {
        userId: { in: userIds },
        pushToken: { not: null },
      },
      select: { userId: true, pushToken: true },
    });
    return devices;
  }

  async findUserEmails(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    return users;
  }
}
