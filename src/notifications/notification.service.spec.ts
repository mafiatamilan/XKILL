import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { DsaGateway } from '../dsa/dsa.gateway';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: Record<string, jest.Mock>;
  let notificationQueue: Record<string, jest.Mock>;
  let dsaGateway: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      createNotification: jest.fn(),
      listNotifications: jest.fn(),
      countNotifications: jest.fn(),
      findNotificationById: jest.fn(),
      markNotificationRead: jest.fn(),
      markAllNotificationsRead: jest.fn(),
      createManyNotifications: jest.fn(),
      createTemplate: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplateByName: jest.fn(),
      listTemplates: jest.fn(),
      countTemplates: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      createAnnouncement: jest.fn(),
      findAnnouncementById: jest.fn(),
      listAnnouncements: jest.fn(),
      countAnnouncements: jest.fn(),
      updateAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
      createBroadcastMessage: jest.fn(),
      findBroadcastMessageById: jest.fn(),
      listBroadcastMessages: jest.fn(),
      countBroadcastMessages: jest.fn(),
      updateBroadcastMessage: jest.fn(),
      findUserIdsByRole: jest.fn(),
      findUserIdsByRoles: jest.fn(),
      findAllActiveUserIds: jest.fn(),
      findUserEmails: jest.fn(),
      findDevicePushTokens: jest.fn(),
      getUserSettings: jest.fn(),
    };

    notificationQueue = {
      add: jest.fn(),
    };

    dsaGateway = {
      emitToUser: jest.fn(),
    };

    service = new NotificationService(
      repository as unknown as NotificationRepository,
      notificationQueue as any,
      dsaGateway as unknown as DsaGateway,
    );
  });

  describe('createNotification', () => {
    it('creates a notification and emits via WebSocket', async () => {
      const mockNotification = {
        id: 'n1',
        userId: 'user-1',
        type: 'system',
        title: 'Test',
        message: 'Hello',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };
      repository.createNotification.mockResolvedValue(mockNotification);

      const result = await service.createNotification('user-1', {
        type: 'system',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.id).toBe('n1');
      expect(repository.createNotification).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'system',
        title: 'Test',
        message: 'Hello',
        metadata: undefined,
      });
      expect(dsaGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification.new',
        expect.objectContaining({
          id: 'n1',
          type: 'system',
          title: 'Test',
        }),
      );
    });
  });

  describe('listMyNotifications', () => {
    it('returns paginated notifications', async () => {
      repository.countNotifications.mockResolvedValue(2);
      repository.listNotifications.mockResolvedValue([
        { id: 'n1', title: 'Test 1' },
        { id: 'n2', title: 'Test 2' },
      ]);

      const result = await service.listMyNotifications('user-1', 1, 20);

      expect(result.meta.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(repository.listNotifications).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
        unreadOnly: undefined,
      });
    });
  });

  describe('markNotificationRead', () => {
    it('marks a notification as read', async () => {
      repository.findNotificationById.mockResolvedValue({ id: 'n1', userId: 'user-1' });
      repository.markNotificationRead.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markNotificationRead('user-1', 'n1');
      expect(result.isRead).toBe(true);
    });

    it('throws NotFoundException for unknown notification', async () => {
      repository.findNotificationById.mockResolvedValue(null);

      await expect(service.markNotificationRead('user-1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException for another user notification', async () => {
      repository.findNotificationById.mockResolvedValue({ id: 'n1', userId: 'other-user' });

      await expect(service.markNotificationRead('user-1', 'n1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('markAllNotificationsRead', () => {
    it('marks all as read', async () => {
      repository.markAllNotificationsRead.mockResolvedValue({ count: 5 });
      const result = await service.markAllNotificationsRead('user-1');
      expect(result.count).toBe(5);
    });
  });

  describe('Announcement CRUD', () => {
    it('creates an announcement', async () => {
      repository.createAnnouncement.mockResolvedValue({
        id: 'a1',
        title: 'Test',
        content: 'Content',
        type: 'general',
        priority: 'normal',
        targetRoles: [],
        isPublished: false,
        publishedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createAnnouncement('admin-1', {
        title: 'Test',
        content: 'Some content here',
      });
      expect(result.id).toBe('a1');
    });

    it('gets an announcement by id', async () => {
      repository.findAnnouncementById.mockResolvedValue({ id: 'a1', title: 'Test' });
      const result = await service.getAnnouncement('a1');
      expect(result.id).toBe('a1');
    });

    it('throws for unknown announcement', async () => {
      repository.findAnnouncementById.mockResolvedValue(null);
      await expect(service.getAnnouncement('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('publishes an unpublished announcement', async () => {
      repository.findAnnouncementById.mockResolvedValue({ id: 'a1', isPublished: false });
      repository.updateAnnouncement.mockResolvedValue({
        id: 'a1',
        isPublished: true,
        publishedAt: new Date(),
      });

      const result = await service.publishAnnouncement('a1');
      expect(result.isPublished).toBe(true);
    });

    it('throws when publishing already published announcement', async () => {
      repository.findAnnouncementById.mockResolvedValue({ id: 'a1', isPublished: true });
      await expect(service.publishAnnouncement('a1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Template CRUD', () => {
    it('creates a template', async () => {
      repository.findTemplateByName.mockResolvedValue(null);
      repository.createTemplate.mockResolvedValue({
        id: 't1',
        name: 'welcome',
        channel: 'email',
        eventType: 'system',
        body: '<h1>Welcome</h1>',
        isActive: true,
      });

      const result = await service.createTemplate({
        name: 'welcome',
        channel: 'email',
        eventType: 'system',
        body: '<h1>Welcome</h1>',
      });
      expect(result.name).toBe('welcome');
    });

    it('rejects duplicate template names', async () => {
      repository.findTemplateByName.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createTemplate({
          name: 'welcome',
          channel: 'email',
          eventType: 'system',
          body: '<h1>Welcome</h1>',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('gets a template by id', async () => {
      repository.findTemplateById.mockResolvedValue({ id: 't1', name: 'welcome' });
      const result = await service.getTemplate('t1');
      expect(result.name).toBe('welcome');
    });

    it('throws for unknown template', async () => {
      repository.findTemplateById.mockResolvedValue(null);
      await expect(service.getTemplate('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('broadcast', () => {
    it('queues a broadcast to all active users', async () => {
      repository.findAllActiveUserIds.mockResolvedValue(['u1', 'u2', 'u3']);
      repository.createBroadcastMessage.mockResolvedValue({
        id: 'b1',
        channel: 'in_app',
        targetUserIds: ['u1', 'u2', 'u3'],
        totalRecipients: 3,
        status: 'pending',
      });
      notificationQueue.add.mockResolvedValue({});

      const result = await service.broadcast(
        {
          title: 'Test Broadcast',
          body: '<p>Hello everyone</p>',
          channel: 'in_app',
        },
        'admin-1',
      );

      expect(result.totalRecipients).toBe(3);
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'fan-out',
        expect.objectContaining({
          broadcastMessageId: 'b1',
          channel: 'in_app',
          targetUserIds: ['u1', 'u2', 'u3'],
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('queues a broadcast to specific roles', async () => {
      repository.findUserIdsByRoles.mockResolvedValue(['s1', 's2']);
      repository.createBroadcastMessage.mockResolvedValue({
        id: 'b2',
        channel: 'email',
        totalRecipients: 2,
        status: 'pending',
      });
      notificationQueue.add.mockResolvedValue({});

      const result = await service.broadcast(
        {
          title: 'Student Alert',
          body: '<p>Important</p>',
          channel: 'email',
          targetRoles: ['student'],
        },
        'admin-1',
      );

      expect(result.totalRecipients).toBe(2);
      expect(repository.findUserIdsByRoles).toHaveBeenCalledWith(['student']);
    });

    it('throws when no recipients found', async () => {
      repository.findAllActiveUserIds.mockResolvedValue([]);

      await expect(
        service.broadcast(
          {
            title: 'Empty',
            body: '<p>No one</p>',
            channel: 'in_app',
          },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listBroadcasts', () => {
    it('returns paginated broadcasts', async () => {
      repository.countBroadcastMessages.mockResolvedValue(1);
      repository.listBroadcastMessages.mockResolvedValue([
        { id: 'b1', title: 'Test', status: 'completed' },
      ]);

      const result = await service.listBroadcasts(1, 20, {});
      expect(result.meta.total).toBe(1);
      expect(result.data.length).toBe(1);
    });
  });

  describe('getBroadcast', () => {
    it('returns a broadcast by id', async () => {
      repository.findBroadcastMessageById.mockResolvedValue({ id: 'b1', title: 'Test' });
      const result = await service.getBroadcast('b1');
      expect(result.id).toBe('b1');
    });

    it('throws for unknown broadcast', async () => {
      repository.findBroadcastMessageById.mockResolvedValue(null);
      await expect(service.getBroadcast('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
