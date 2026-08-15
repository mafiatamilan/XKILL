import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Notifications & Communication (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    await testApp.app.listen(0);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createAdmin = async () => {
    const user = await factory.createUser({ role: 'admin' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  const createStudent = async () => {
    const user = await factory.createUser({ role: 'student' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  const createFaculty = async () => {
    const user = await factory.createUser({ role: 'faculty' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  describe('Student notification reads', () => {
    it('returns 401 for unauthenticated access', async () => {
      await request.get(`${API}/notifications/me`).expect(401);
    });

    it('lists empty notifications for a new student', async () => {
      const student = await createStudent();
      const res = await request.get(`${API}/notifications/me`).set(auth(student.token)).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('marks all notifications as read', async () => {
      const student = await createStudent();
      const res = await request
        .patch(`${API}/notifications/read-all`)
        .set(auth(student.token))
        .expect(200);

      expect(res.body.count).toBe(0);
    });

    it('returns 404 when marking unknown notification as read', async () => {
      const student = await createStudent();
      await request
        .patch(`${API}/notifications/nonexistent/read`)
        .set(auth(student.token))
        .expect(404);
    });
  });

  describe('Admin announcements CRUD', () => {
    it('creates an announcement as admin', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Campus Drive Announcement',
          content: 'TCS is conducting a campus placement drive for all eligible students.',
          type: 'placement',
          priority: 'high',
        })
        .expect(201);

      expect(res.body.title).toBe('Campus Drive Announcement');
      expect(res.body.type).toBe('placement');
      expect(res.body.isPublished).toBe(false);
    });

    it('lists announcements', async () => {
      const admin = await createAdmin();
      await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Test Announcement',
          content: 'This is a test announcement for listing purposes.',
        })
        .expect(201);

      const res = await request
        .get(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
    });

    it('gets an announcement by ID', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Get Test',
          content: 'This announcement will be retrieved by ID.',
        })
        .expect(201);

      const res = await request
        .get(`${API}/admin/announcements/${createRes.body.id}`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.title).toBe('Get Test');
    });

    it('updates an announcement', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Before Update',
          content: 'This announcement will be updated with new content.',
        })
        .expect(201);

      const res = await request
        .patch(`${API}/admin/announcements/${createRes.body.id}`)
        .set(auth(admin.token))
        .send({ title: 'After Update' })
        .expect(200);

      expect(res.body.title).toBe('After Update');
    });

    it('publishes an announcement', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Publish Test',
          content: 'This announcement will be published.',
        })
        .expect(201);

      const res = await request
        .post(`${API}/admin/announcements/${createRes.body.id}/publish`)
        .set(auth(admin.token))
        .expect(201);

      expect(res.body.isPublished).toBe(true);
      expect(res.body.publishedAt).toBeDefined();
    });

    it('deletes an announcement', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Delete Test',
          content: 'This announcement will be deleted.',
        })
        .expect(201);

      await request
        .delete(`${API}/admin/announcements/${createRes.body.id}`)
        .set(auth(admin.token))
        .expect(200);

      await request
        .get(`${API}/admin/announcements/${createRes.body.id}`)
        .set(auth(admin.token))
        .expect(404);
    });

    it('returns 403 when student tries to create announcement', async () => {
      const student = await createStudent();
      await request
        .post(`${API}/admin/announcements`)
        .set(auth(student.token))
        .send({
          title: 'Unauthorized',
          content: 'This should fail because students cannot create announcements.',
        })
        .expect(403);
    });
  });

  describe('Admin broadcast', () => {
    it('broadcasts a notification to all users', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'System Maintenance',
          body: '<p>Scheduled maintenance on Sunday.</p>',
          channel: 'in_app',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.channel).toBe('in_app');
      expect(res.body.status).toBe('pending');
      expect(res.body.totalRecipients).toBeGreaterThanOrEqual(0);
    });

    it('broadcasts to specific roles', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'Student Only Alert',
          body: '<p>Important for students.</p>',
          channel: 'in_app',
          targetRoles: ['student'],
        })
        .expect(201);

      expect(res.body.totalRecipients).toBeGreaterThanOrEqual(0);
    });

    it('lists broadcasts', async () => {
      const admin = await createAdmin();
      await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'List Test Broadcast',
          body: '<p>Testing broadcast listing.</p>',
          channel: 'in_app',
        })
        .expect(201);

      const res = await request.get(`${API}/admin/broadcast`).set(auth(admin.token)).expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
    });

    it('gets a broadcast by ID', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'Get Broadcast Test',
          body: '<p>This broadcast will be retrieved.</p>',
          channel: 'in_app',
        })
        .expect(201);

      const res = await request
        .get(`${API}/admin/broadcast/${createRes.body.id}`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.title).toBe('Get Broadcast Test');
    });

    it('returns 403 when student tries to broadcast', async () => {
      const student = await createStudent();
      await request
        .post(`${API}/admin/broadcast`)
        .set(auth(student.token))
        .send({
          title: 'Unauthorized',
          body: '<p>This should fail.</p>',
          channel: 'in_app',
        })
        .expect(403);
    });

    it('returns 400 when no recipients found', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'Empty Broadcast',
          body: '<p>No recipients.</p>',
          channel: 'in_app',
          targetRoles: ['nonexistent_role'],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('Admin templates CRUD', () => {
    it('creates a template', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'welcome-template',
          channel: 'email',
          eventType: 'system',
          subject: 'Welcome to XKILL',
          body: '<h1>Welcome!</h1><p>Thank you for joining.</p>',
        })
        .expect(201);

      expect(res.body.name).toBe('welcome-template');
      expect(res.body.channel).toBe('email');
    });

    it('lists templates', async () => {
      const admin = await createAdmin();
      await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'list-template',
          channel: 'in_app',
          eventType: 'announcement',
          body: '<p>List test template.</p>',
        })
        .expect(201);

      const res = await request
        .get(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('updates a template', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'update-template',
          channel: 'in_app',
          eventType: 'system',
          body: '<p>Before update.</p>',
        })
        .expect(201);

      const res = await request
        .patch(`${API}/admin/notification-templates/${createRes.body.id}`)
        .set(auth(admin.token))
        .send({ body: '<p>After update.</p>' })
        .expect(200);

      expect(res.body.body).toBe('<p>After update.</p>');
    });

    it('deletes a template', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'delete-template',
          channel: 'in_app',
          eventType: 'system',
          body: '<p>Will be deleted.</p>',
        })
        .expect(201);

      await request
        .delete(`${API}/admin/notification-templates/${createRes.body.id}`)
        .set(auth(admin.token))
        .expect(200);
    });

    it('rejects duplicate template names', async () => {
      const admin = await createAdmin();
      await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'unique-template',
          channel: 'email',
          eventType: 'system',
          body: '<p>First one.</p>',
        })
        .expect(201);

      const res = await request
        .post(`${API}/admin/notification-templates`)
        .set(auth(admin.token))
        .send({
          name: 'unique-template',
          channel: 'email',
          eventType: 'system',
          body: '<p>Duplicate name.</p>',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('Faculty broadcast via legacy endpoint', () => {
    it('broadcasts notification through faculty portal', async () => {
      const faculty = await createFaculty();
      const res = await request
        .post(`${API}/faculty/notifications/broadcast`)
        .set(auth(faculty.token))
        .send({
          title: 'Faculty Broadcast',
          message: 'Important notice from faculty.',
        })
        .expect(201);

      expect(res.body.sentTo).toBeGreaterThanOrEqual(0);
      expect(res.body.title).toBe('Faculty Broadcast');
    });
  });

  describe('Full lifecycle', () => {
    it('creates announcement → publishes → broadcasts → student reads', async () => {
      const admin = await createAdmin();
      const student = await createStudent();

      // Create and publish announcement
      const announcementRes = await request
        .post(`${API}/admin/announcements`)
        .set(auth(admin.token))
        .send({
          title: 'Lifecycle Test',
          content: 'Testing the full notification lifecycle end-to-end.',
          type: 'academic',
        })
        .expect(201);

      await request
        .post(`${API}/admin/announcements/${announcementRes.body.id}/publish`)
        .set(auth(admin.token))
        .expect(201);

      // Broadcast to students
      const broadcastRes = await request
        .post(`${API}/admin/broadcast`)
        .set(auth(admin.token))
        .send({
          title: 'Lifecycle Broadcast',
          body: '<p>Full lifecycle test broadcast.</p>',
          channel: 'in_app',
          targetRoles: ['student'],
        })
        .expect(201);

      expect(broadcastRes.body.status).toBe('pending');

      // Student reads notifications (may be empty if queue not processed yet)
      const notificationsRes = await request
        .get(`${API}/notifications/me`)
        .set(auth(student.token))
        .expect(200);

      expect(notificationsRes.body.data).toBeDefined();
      expect(notificationsRes.body.meta).toBeDefined();
    });
  });
});
