import supertest from 'supertest';
import { faker } from '@faker-js/faker';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory } from './support/factories';
import { TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Student Platform (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const registerStudent = async () => {
    const email = faker.internet.email().toLowerCase();
    const _register = await request
      .post(`${API}/auth/register`)
      .send({ email, password: TEST_PASSWORD, fullName: 'Student' })
      .expect(201);
    const token = testApp.mailer.extractToken('email-verification', 'token');
    await request.get(`${API}/auth/verify-email/${token}`).expect(200);
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return { email, accessToken: login.body.accessToken as string };
  };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createFaculty = async () => {
    const user = await factory.createUser({ role: 'faculty' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return login.body.accessToken as string;
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/students/me/profile`).expect(401);
      await request.get(`${API}/students/me/dashboard`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const token = await createFaculty();
      await request.get(`${API}/students/me/profile`).set(auth(token)).expect(403);
      await request.get(`${API}/students/me/skills`).set(auth(token)).expect(403);
    });
  });

  describe('profile', () => {
    it('returns an empty default profile for a fresh student', async () => {
      const { accessToken } = await registerStudent();
      const res = await request
        .get(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .expect(200);
      expect(res.body.completionPercent).toBe(0);
      expect(res.body.isProfileVisible).toBe(true);
    });

    it('creates/updates the profile via PATCH', async () => {
      const { accessToken } = await registerStudent();
      const res = await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ headline: 'Aspiring SDE', city: 'Mumbai', collegeName: 'VJTI' })
        .expect(200);
      expect(res.body.headline).toBe('Aspiring SDE');
      expect(res.body.city).toBe('Mumbai');
      expect(res.body.completionPercent).toBeGreaterThan(0);

      const read = await request
        .get(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .expect(200);
      expect(read.body.headline).toBe('Aspiring SDE');
    });

    it('rejects 400 for an invalid payload', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ currentSemester: 'not-a-number' })
        .expect(400);
      await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ unknownField: 'x' })
        .expect(400);
    });
  });

  describe('skills', () => {
    it('starts empty, creates, lists, updates, deletes', async () => {
      const { accessToken } = await registerStudent();

      const empty = await request
        .get(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .expect(200);
      expect(empty.body.data).toHaveLength(0);

      const created = await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'TypeScript', category: 'programming', proficiencyLevel: 'advanced' })
        .expect(201);
      expect(created.body.name).toBe('TypeScript');

      const list = await request
        .get(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .expect(200);
      expect(list.body.meta.total).toBe(1);
      expect(list.body.data[0].proficiencyLevel).toBe('advanced');

      const updated = await request
        .patch(`${API}/students/me/skills/${created.body.id}`)
        .set(auth(accessToken))
        .send({ proficiencyLevel: 'expert' })
        .expect(200);
      expect(updated.body.proficiencyLevel).toBe('expert');

      await request
        .delete(`${API}/students/me/skills/${created.body.id}`)
        .set(auth(accessToken))
        .expect(204);

      const after = await request
        .get(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .expect(200);
      expect(after.body.meta.total).toBe(0);
    });

    it('rejects a duplicate skill with 409', async () => {
      const { accessToken } = await registerStudent();
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'Python' })
        .expect(201);
      const res = await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'python' })
        .expect(409);
      expect(res.body.code).toBe('SKILL_ALREADY_EXISTS');
    });

    it('returns 404 for an unknown skill', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/skills/nope`)
        .set(auth(accessToken))
        .send({})
        .expect(404);
      await request.delete(`${API}/students/me/skills/nope`).set(auth(accessToken)).expect(404);
    });

    it('returns 400 for an invalid skill payload', async () => {
      const { accessToken } = await registerStudent();
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: '' })
        .expect(400);
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'Go', proficiencyLevel: 'guru' })
        .expect(400);
    });
  });

  describe('career goals', () => {
    it('creates, lists, updates, and deletes a goal', async () => {
      const { accessToken } = await registerStudent();

      const created = await request
        .post(`${API}/students/me/career-goals`)
        .set(auth(accessToken))
        .send({
          title: 'Backend engineer at a top company',
          targetRole: 'Backend Engineer',
          targetCompanies: ['Google'],
          targetCtcLakhs: 30,
          targetDate: '2026-12-31',
        })
        .expect(201);
      expect(created.body.status).toBe('active');
      expect(created.body.targetCompanies).toEqual(['Google']);

      const list = await request
        .get(`${API}/students/me/career-goals`)
        .set(auth(accessToken))
        .expect(200);
      expect(list.body.meta.total).toBe(1);

      const updated = await request
        .patch(`${API}/students/me/career-goals/${created.body.id}`)
        .set(auth(accessToken))
        .send({ status: 'achieved', targetCtcLakhs: 32 })
        .expect(200);
      expect(updated.body.status).toBe('achieved');

      await request
        .delete(`${API}/students/me/career-goals/${created.body.id}`)
        .set(auth(accessToken))
        .expect(204);
    });

    it('returns 404 for an unknown goal', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/career-goals/nope`)
        .set(auth(accessToken))
        .send({})
        .expect(404);
    });

    it('returns 400 for invalid goal data', async () => {
      const { accessToken } = await registerStudent();
      await request
        .post(`${API}/students/me/career-goals`)
        .set(auth(accessToken))
        .send({ title: '', targetDate: 'not-a-date' })
        .expect(400);
    });
  });

  describe('calendar', () => {
    it('creates, lists, updates, and deletes events', async () => {
      const { accessToken } = await registerStudent();

      const created = await request
        .post(`${API}/students/me/calendar`)
        .set(auth(accessToken))
        .send({
          title: 'Mock interview',
          eventType: 'interview',
          startAt: '2026-08-10T09:00:00.000Z',
          endAt: '2026-08-10T10:00:00.000Z',
        })
        .expect(201);
      expect(created.body.eventType).toBe('interview');

      const list = await request
        .get(`${API}/students/me/calendar`)
        .set(auth(accessToken))
        .expect(200);
      expect(list.body.meta.total).toBe(1);

      const updated = await request
        .patch(`${API}/students/me/calendar/${created.body.id}`)
        .set(auth(accessToken))
        .send({ title: 'Rescheduled mock' })
        .expect(200);
      expect(updated.body.title).toBe('Rescheduled mock');

      await request
        .delete(`${API}/students/me/calendar/${created.body.id}`)
        .set(auth(accessToken))
        .expect(204);
    });

    it('returns 404 for an unknown event', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/calendar/nope`)
        .set(auth(accessToken))
        .send({})
        .expect(404);
    });

    it('returns 400 for an invalid event payload', async () => {
      const { accessToken } = await registerStudent();
      await request
        .post(`${API}/students/me/calendar`)
        .set(auth(accessToken))
        .send({ title: 'X', startAt: 'not-a-date' })
        .expect(400);
    });
  });

  describe('settings', () => {
    it('returns defaults on first access', async () => {
      const { accessToken } = await registerStudent();
      const res = await request
        .get(`${API}/students/me/settings`)
        .set(auth(accessToken))
        .expect(200);
      expect(res.body.theme).toBe('light');
      expect(res.body.emailNotifications).toBe(true);
    });

    it('updates settings', async () => {
      const { accessToken } = await registerStudent();
      const res = await request
        .patch(`${API}/students/me/settings`)
        .set(auth(accessToken))
        .send({ theme: 'dark', emailNotifications: false })
        .expect(200);
      expect(res.body.theme).toBe('dark');
      expect(res.body.emailNotifications).toBe(false);

      const read = await request
        .get(`${API}/students/me/settings`)
        .set(auth(accessToken))
        .expect(200);
      expect(read.body.theme).toBe('dark');
    });

    it('returns 400 for invalid settings', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/settings`)
        .set(auth(accessToken))
        .send({ theme: 'neon' })
        .expect(400);
    });
  });

  describe('readiness score', () => {
    it('returns no score before the first recalculate', async () => {
      const { accessToken } = await registerStudent();
      const res = await request
        .get(`${API}/students/me/readiness-score`)
        .set(auth(accessToken))
        .expect(200);
      expect(res.body.overall).toBeUndefined();
    });

    it('recalculates deterministically from profile state', async () => {
      const { accessToken } = await registerStudent();

      await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ headline: 'SDE', city: 'Mumbai', collegeName: 'VJTI' })
        .expect(200);
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'TypeScript', proficiencyLevel: 'advanced' })
        .expect(201);
      await request
        .post(`${API}/students/me/career-goals`)
        .set(auth(accessToken))
        .send({ title: 'SDE', targetRole: 'SDE', targetCompanies: ['Google'], targetCtcLakhs: 30 })
        .expect(201);

      const res = await request
        .post(`${API}/students/me/readiness-score/recalculate`)
        .set(auth(accessToken))
        .expect(201);
      expect(res.body.overall).toBeGreaterThan(0);
      expect(res.body.components).toMatchObject({
        profile: expect.any(Number),
        skills: expect.any(Number),
        careerGoal: expect.any(Number),
        activity: expect.any(Number),
      });

      const again = await request
        .post(`${API}/students/me/readiness-score/recalculate`)
        .set(auth(accessToken))
        .expect(201);
      expect(again.body.overall).toBe(res.body.overall);

      const read = await request
        .get(`${API}/students/me/readiness-score`)
        .set(auth(accessToken))
        .expect(200);
      expect(read.body.overall).toBe(res.body.overall);
    });
  });

  describe('notifications', () => {
    it('lists, marks one read, and marks all read', async () => {
      const { accessToken } = await registerStudent();
      const me = await db.prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
      const created = await db.prisma.notification.createMany({
        data: [
          { userId: me!.id, type: 'placement', title: 'Drive 1', message: 'Amazon hiring' },
          { userId: me!.id, type: 'system', title: 'Welcome', message: 'Welcome to XKILL' },
        ],
      });
      expect(created.count).toBe(2);

      const list = await request
        .get(`${API}/students/me/notifications`)
        .set(auth(accessToken))
        .expect(200);
      expect(list.body.meta.total).toBe(2);
      const target = list.body.data[0].id;

      const unreadOnly = await request
        .get(`${API}/students/me/notifications?unreadOnly=true`)
        .set(auth(accessToken))
        .expect(200);
      expect(unreadOnly.body.meta.total).toBe(2);

      await request
        .patch(`${API}/students/me/notifications/${target}/read`)
        .set(auth(accessToken))
        .expect(200);

      const afterOne = await request
        .get(`${API}/students/me/notifications?unreadOnly=true`)
        .set(auth(accessToken))
        .expect(200);
      expect(afterOne.body.meta.total).toBe(1);

      const readAll = await request
        .patch(`${API}/students/me/notifications/read-all`)
        .set(auth(accessToken))
        .expect(200);
      expect(readAll.body.markedCount).toBe(1);

      const afterAll = await request
        .get(`${API}/students/me/notifications?unreadOnly=true`)
        .set(auth(accessToken))
        .expect(200);
      expect(afterAll.body.meta.total).toBe(0);
    });

    it('returns 404 for an unknown notification', async () => {
      const { accessToken } = await registerStudent();
      await request
        .patch(`${API}/students/me/notifications/nope/read`)
        .set(auth(accessToken))
        .expect(404);
    });
  });

  describe('activity timeline', () => {
    it('records and lists activity from profile/skill/goal mutations', async () => {
      const { accessToken } = await registerStudent();

      await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ headline: 'Active' })
        .expect(200);
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(accessToken))
        .send({ name: 'React' })
        .expect(201);
      await request
        .post(`${API}/students/me/career-goals`)
        .set(auth(accessToken))
        .send({ title: 'Goal' })
        .expect(201);

      const res = await request
        .get(`${API}/students/me/activity-timeline`)
        .set(auth(accessToken))
        .expect(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
      const types = res.body.data.map((entry: { type: string }) => entry.type);
      expect(types).toContain('profile');
      expect(types).toContain('skill');
      expect(types).toContain('career_goal');
    });
  });

  describe('dashboard', () => {
    it('aggregates readiness, notifications, upcoming events, and activity', async () => {
      const { accessToken } = await registerStudent();

      const empty = await request
        .get(`${API}/students/me/dashboard`)
        .set(auth(accessToken))
        .expect(200);
      expect(empty.body.readinessScore).toBeNull();
      expect(empty.body.unreadNotifications).toBe(0);
      expect(empty.body.upcomingEvents).toEqual([]);

      await request
        .patch(`${API}/students/me/profile`)
        .set(auth(accessToken))
        .send({ headline: 'SDE' })
        .expect(200);
      await request
        .post(`${API}/students/me/calendar`)
        .set(auth(accessToken))
        .send({
          title: 'Upcoming interview',
          startAt: '2026-08-20T09:00:00.000Z',
        })
        .expect(201);
      await request
        .post(`${API}/students/me/readiness-score/recalculate`)
        .set(auth(accessToken))
        .expect(201);

      const me = await db.prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
      await db.prisma.notification.create({
        data: { userId: me!.id, type: 'system', title: 'N', message: 'M' },
      });

      const res = await request
        .get(`${API}/students/me/dashboard`)
        .set(auth(accessToken))
        .expect(200);
      expect(res.body.readinessScore.overall).toBeGreaterThan(0);
      expect(res.body.unreadNotifications).toBe(1);
      expect(res.body.upcomingEvents).toHaveLength(1);
      expect(res.body.recentActivity.length).toBeGreaterThanOrEqual(2);
      expect(res.body.profileCompletionPercent).toBeGreaterThan(0);
    });
  });
});
