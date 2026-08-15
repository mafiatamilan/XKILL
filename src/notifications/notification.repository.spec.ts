import { NotificationRepository } from './notification.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        createMany: jest.fn(),
      },
      notificationTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      announcement: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      broadcastMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      device: {
        findMany: jest.fn(),
      },
      userSettings: {
        findUnique: jest.fn(),
      },
    };

    repository = new NotificationRepository(prisma as unknown as PrismaService);
  });

  describe('Notification CRUD', () => {
    it('creates a notification', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        type: 'system',
        title: 'Test',
        message: 'Hello',
      });

      const result = await repository.createNotification({
        userId: 'user-1',
        type: 'system',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.id).toBe('n1');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'system',
          title: 'Test',
          message: 'Hello',
          metadata: undefined,
        },
      });
    });

    it('lists notifications with pagination', async () => {
      prisma.notification.count.mockResolvedValue(2);
      prisma.notification.findMany.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);

      const result = await repository.listNotifications({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });

      expect(result.length).toBe(2);
    });

    it('counts notifications with unread filter', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await repository.countNotifications('user-1', true);
      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('marks a notification as read', async () => {
      prisma.notification.update.mockResolvedValue({
        id: 'n1',
        isRead: true,
        readAt: new Date(),
      });

      const result = await repository.markNotificationRead('n1');
      expect(result.isRead).toBe(true);
    });

    it('marks all notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await repository.markAllNotificationsRead('user-1');
      expect(result.count).toBe(3);
    });

    it('creates many notifications', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.createManyNotifications([
        { userId: 'u1', type: 'broadcast', title: 'Test', message: 'Hello' },
        { userId: 'u2', type: 'broadcast', title: 'Test', message: 'Hello' },
      ]);

      expect(result.count).toBe(2);
    });
  });

  describe('Template CRUD', () => {
    it('creates a template', async () => {
      prisma.notificationTemplate.create.mockResolvedValue({
        id: 't1',
        name: 'welcome',
        channel: 'email',
        body: '<h1>Welcome</h1>',
      });

      const result = await repository.createTemplate({
        name: 'welcome',
        channel: 'email',
        eventType: 'system',
        body: '<h1>Welcome</h1>',
      });

      expect(result.name).toBe('welcome');
    });

    it('finds a template by name', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue({ id: 't1', name: 'welcome' });

      const result = await repository.findTemplateByName('welcome');
      expect(result!.id).toBe('t1');
    });

    it('lists templates', async () => {
      prisma.notificationTemplate.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

      const result = await repository.listTemplates({ skip: 0, take: 10 });
      expect(result.length).toBe(2);
    });

    it('updates a template', async () => {
      prisma.notificationTemplate.update.mockResolvedValue({
        id: 't1',
        body: '<h1>Updated</h1>',
      });

      const result = await repository.updateTemplate('t1', { body: '<h1>Updated</h1>' });
      expect(result.body).toBe('<h1>Updated</h1>');
    });

    it('deletes a template', async () => {
      prisma.notificationTemplate.delete.mockResolvedValue({ id: 't1' });
      const result = await repository.deleteTemplate('t1');
      expect(result.id).toBe('t1');
    });
  });

  describe('Announcement CRUD', () => {
    it('creates an announcement', async () => {
      prisma.announcement.create.mockResolvedValue({
        id: 'a1',
        title: 'Test',
        content: 'Content',
      });

      const result = await repository.createAnnouncement({
        authorId: 'admin-1',
        title: 'Test',
        content: 'Content',
      });

      expect(result.title).toBe('Test');
    });

    it('finds an announcement by id', async () => {
      prisma.announcement.findUnique.mockResolvedValue({ id: 'a1', title: 'Test' });

      const result = await repository.findAnnouncementById('a1');
      expect(result!.title).toBe('Test');
    });

    it('lists announcements', async () => {
      prisma.announcement.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await repository.listAnnouncements({ skip: 0, take: 10 });
      expect(result.length).toBe(1);
    });

    it('updates an announcement', async () => {
      prisma.announcement.update.mockResolvedValue({ id: 'a1', title: 'Updated' });

      const result = await repository.updateAnnouncement('a1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('deletes an announcement', async () => {
      prisma.announcement.delete.mockResolvedValue({ id: 'a1' });
      const result = await repository.deleteAnnouncement('a1');
      expect(result.id).toBe('a1');
    });

    it('finds active announcements for a role', async () => {
      prisma.announcement.findMany.mockResolvedValue([
        { id: 'a1', title: 'Active', isPublished: true },
      ]);

      const result = await repository.findActiveAnnouncementsForRole('student');
      expect(result.length).toBe(1);
    });
  });

  describe('BroadcastMessage CRUD', () => {
    it('creates a broadcast message', async () => {
      prisma.broadcastMessage.create.mockResolvedValue({
        id: 'b1',
        channel: 'in_app',
        targetUserIds: ['u1', 'u2'],
        totalRecipients: 2,
        status: 'pending',
      });

      const result = await repository.createBroadcastMessage({
        channel: 'in_app',
        targetUserIds: ['u1', 'u2'],
        title: 'Test',
        body: '<p>Hello</p>',
        createdBy: 'admin-1',
      });

      expect(result.totalRecipients).toBe(2);
      expect(result.status).toBe('pending');
    });

    it('lists broadcast messages', async () => {
      prisma.broadcastMessage.findMany.mockResolvedValue([{ id: 'b1' }]);

      const result = await repository.listBroadcastMessages({ skip: 0, take: 10 });
      expect(result.length).toBe(1);
    });

    it('updates broadcast message status', async () => {
      prisma.broadcastMessage.update.mockResolvedValue({
        id: 'b1',
        status: 'completed',
        sentCount: 5,
      });

      const result = await repository.updateBroadcastMessage('b1', {
        status: 'completed',
        sentCount: 5,
      });
      expect(result.status).toBe('completed');
    });
  });

  describe('User queries', () => {
    it('finds user IDs by role', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      const result = await repository.findUserIdsByRole('student');
      expect(result).toEqual(['u1', 'u2']);
    });

    it('finds user IDs by multiple roles', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);

      const result = await repository.findUserIdsByRoles(['student', 'faculty']);
      expect(result).toEqual(['u1']);
    });

    it('finds all active user IDs', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);

      const result = await repository.findAllActiveUserIds();
      expect(result.length).toBe(3);
    });

    it('finds user emails', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'test@example.com' }]);

      const result = await repository.findUserEmails(['u1']);
      expect(result[0].email).toBe('test@example.com');
    });

    it('finds device push tokens', async () => {
      prisma.device.findMany.mockResolvedValue([{ userId: 'u1', pushToken: 'token-abc' }]);

      const result = await repository.findDevicePushTokens(['u1']);
      expect(result[0].pushToken).toBe('token-abc');
    });
  });
});
