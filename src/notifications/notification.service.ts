import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationRepository } from './notification.repository';
import { DsaGateway } from '../dsa/dsa.gateway';

export const NOTIFICATION_QUEUE = 'notification-fan-out';

export interface FanOutJobData {
  broadcastMessageId: string;
  channel: string;
  targetUserIds: string[];
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  templateId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repository: NotificationRepository,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    private readonly dsaGateway: DsaGateway,
  ) {}

  // ── Single notification create (used by other modules) ─────────────────

  async createNotification(
    userId: string,
    data: { type: string; title: string; message: string; metadata?: Record<string, unknown> },
  ) {
    const notification = await this.repository.createNotification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    });

    this.dsaGateway.emitToUser(userId, 'notification.new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }

  // ── Student notification reads ─────────────────────────────────────────

  async listMyNotifications(userId: string, page: number, limit: number, unreadOnly?: boolean) {
    const [total, notifications] = await Promise.all([
      this.repository.countNotifications(userId, unreadOnly),
      this.repository.listNotifications({
        userId,
        skip: (page - 1) * limit,
        take: limit,
        unreadOnly,
      }),
    ]);
    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.repository.findNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    }
    if (notification.userId !== userId) {
      throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    }
    return this.repository.markNotificationRead(notificationId);
  }

  async markAllNotificationsRead(userId: string) {
    return this.repository.markAllNotificationsRead(userId);
  }

  // ── Announcement CRUD (admin) ──────────────────────────────────────────

  async createAnnouncement(
    authorId: string,
    dto: {
      title: string;
      content: string;
      type?: string;
      priority?: string;
      targetRoles?: string[];
      isPublished?: boolean;
      expiresAt?: string;
    },
  ) {
    return this.repository.createAnnouncement({
      authorId,
      title: dto.title,
      content: dto.content,
      type: dto.type,
      priority: dto.priority,
      targetRoles: dto.targetRoles,
      isPublished: dto.isPublished,
      publishedAt: dto.isPublished ? new Date() : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  async listAnnouncements(
    page: number,
    limit: number,
    filters: {
      type?: string;
      isPublished?: boolean;
      authorId?: string;
    },
  ) {
    const [total, announcements] = await Promise.all([
      this.repository.countAnnouncements(filters.type, filters.isPublished, filters.authorId),
      this.repository.listAnnouncements({
        skip: (page - 1) * limit,
        take: limit,
        ...filters,
      }),
    ]);
    return {
      data: announcements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnnouncement(id: string) {
    const announcement = await this.repository.findAnnouncementById(id);
    if (!announcement) {
      throw new NotFoundException('ANNOUNCEMENT_NOT_FOUND');
    }
    return announcement;
  }

  async updateAnnouncement(
    id: string,
    dto: {
      title?: string;
      content?: string;
      type?: string;
      priority?: string;
      targetRoles?: string[];
      isPublished?: boolean;
      expiresAt?: string;
    },
  ) {
    await this.getAnnouncement(id);
    return this.repository.updateAnnouncement(id, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      publishedAt: dto.isPublished ? new Date() : undefined,
    });
  }

  async deleteAnnouncement(id: string) {
    await this.getAnnouncement(id);
    return this.repository.deleteAnnouncement(id);
  }

  async publishAnnouncement(id: string) {
    const announcement = await this.getAnnouncement(id);
    if (announcement.isPublished) {
      throw new BadRequestException('ANNOUNCEMENT_ALREADY_PUBLISHED');
    }
    return this.repository.updateAnnouncement(id, {
      isPublished: true,
      publishedAt: new Date(),
    });
  }

  // ── Template CRUD (admin) ──────────────────────────────────────────────

  async createTemplate(dto: {
    name: string;
    channel: string;
    eventType: string;
    subject?: string;
    body: string;
  }) {
    const existing = await this.repository.findTemplateByName(dto.name);
    if (existing) {
      throw new BadRequestException('TEMPLATE_NAME_EXISTS');
    }
    return this.repository.createTemplate(dto);
  }

  async listTemplates(
    page: number,
    limit: number,
    filters: {
      channel?: string;
      isActive?: boolean;
    },
  ) {
    const [total, templates] = await Promise.all([
      this.repository.countTemplates(filters.channel, filters.isActive),
      this.repository.listTemplates({
        skip: (page - 1) * limit,
        take: limit,
        ...filters,
      }),
    ]);
    return {
      data: templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplate(id: string) {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new NotFoundException('TEMPLATE_NOT_FOUND');
    }
    return template;
  }

  async updateTemplate(
    id: string,
    dto: {
      name?: string;
      channel?: string;
      eventType?: string;
      subject?: string;
      body?: string;
      isActive?: boolean;
    },
  ) {
    await this.getTemplate(id);
    return this.repository.updateTemplate(id, dto);
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    return this.repository.deleteTemplate(id);
  }

  // ── Broadcast fan-out (admin) ──────────────────────────────────────────

  async broadcast(
    dto: {
      title: string;
      body: string;
      channel: string;
      targetRoles?: string[];
      templateId?: string;
      announcementId?: string;
      metadata?: Record<string, unknown>;
    },
    createdBy: string,
  ) {
    let targetUserIds: string[];

    if (dto.targetRoles && dto.targetRoles.length > 0) {
      targetUserIds = await this.repository.findUserIdsByRoles(dto.targetRoles);
    } else {
      targetUserIds = await this.repository.findAllActiveUserIds();
    }

    if (targetUserIds.length === 0) {
      throw new BadRequestException('NO_RECIPIENTS_FOUND');
    }

    const broadcastMessage = await this.repository.createBroadcastMessage({
      templateId: dto.templateId,
      announcementId: dto.announcementId,
      channel: dto.channel,
      targetUserIds,
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata,
      createdBy,
    });

    await this.notificationQueue.add(
      'fan-out',
      {
        broadcastMessageId: broadcastMessage.id,
        channel: dto.channel,
        targetUserIds,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata,
        templateId: dto.templateId,
      } satisfies FanOutJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(
      `Broadcast ${broadcastMessage.id} queued: ${targetUserIds.length} recipients via ${dto.channel}`,
    );

    return broadcastMessage;
  }

  async listBroadcasts(
    page: number,
    limit: number,
    filters: {
      status?: string;
      createdBy?: string;
    },
  ) {
    const [total, broadcasts] = await Promise.all([
      this.repository.countBroadcastMessages(filters.status, filters.createdBy),
      this.repository.listBroadcastMessages({
        skip: (page - 1) * limit,
        take: limit,
        ...filters,
      }),
    ]);
    return {
      data: broadcasts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBroadcast(id: string) {
    const broadcast = await this.repository.findBroadcastMessageById(id);
    if (!broadcast) {
      throw new NotFoundException('BROADCAST_NOT_FOUND');
    }
    return broadcast;
  }
}
