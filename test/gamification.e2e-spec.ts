import supertest from 'supertest';
import { Prisma } from '@prisma/client';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Gamification (e2e)', () => {
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

  const createStudent = async () => {
    const user = await factory.createUser({ role: 'student' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  const seedLevel = async (level: number, minXp: number, title: string) => {
    await db.prisma.level.upsert({
      where: { level },
      create: { level, minXp, title },
      update: { minXp, title },
    });
  };

  const seedBadge = async (name: string, category: string, criteria: Record<string, unknown>) => {
    return db.prisma.badge.upsert({
      where: { name },
      create: {
        name,
        description: `Test badge: ${name}`,
        category,
        criteria: criteria as unknown as Prisma.InputJsonValue,
      },
      update: { criteria: criteria as unknown as Prisma.InputJsonValue },
    });
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/gamification/me/summary`).expect(401);
    });

    it('returns 403 for non-allowed roles', async () => {
      const user = await factory.createUser({ role: 'recruiter' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .get(`${API}/gamification/me/summary`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('GET /gamification/me/summary', () => {
    it('returns summary with zero XP for new student', async () => {
      const alice = await createStudent();
      const res = await request
        .get(`${API}/gamification/me/summary`)
        .set(auth(alice.token))
        .expect(200);

      expect(res.body.userId).toBe(alice.user.id);
      expect(res.body.totalXp).toBe(0);
      expect(res.body.currentStreak).toBe(0);
      expect(res.body.todayClaimed).toBe(false);
    });
  });

  describe('POST /gamification/daily-reward/claim', () => {
    it('claims daily reward and returns day + xp', async () => {
      const alice = await createStudent();
      await seedLevel(1, 0, 'Novice');

      const res = await request
        .post(`${API}/gamification/daily-reward/claim`)
        .set(auth(alice.token))
        .send({})
        .expect(201);

      expect(res.body.day).toBeGreaterThanOrEqual(1);
      expect(res.body.xpAwarded).toBeGreaterThanOrEqual(10);
      expect(res.body.streak).toBeGreaterThanOrEqual(1);
    });

    it('returns 409 on duplicate claim same day', async () => {
      const alice = await createStudent();
      await seedLevel(1, 0, 'Novice');

      await request
        .post(`${API}/gamification/daily-reward/claim`)
        .set(auth(alice.token))
        .send({})
        .expect(201);

      await request
        .post(`${API}/gamification/daily-reward/claim`)
        .set(auth(alice.token))
        .send({})
        .expect(409);
    });
  });

  describe('GET /gamification/badges', () => {
    it('returns list of badges', async () => {
      const alice = await createStudent();
      await seedBadge('First Solve', 'coding', { type: 'problems_solved', count: 1 });

      const res = await request
        .get(`${API}/gamification/badges`)
        .set(auth(alice.token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].name).toBeDefined();
    });
  });

  describe('GET /gamification/missions', () => {
    it('returns list of missions', async () => {
      const alice = await createStudent();

      const res = await request
        .get(`${API}/gamification/missions`)
        .set(auth(alice.token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /gamification/weekly-challenges', () => {
    it('returns list of weekly challenges', async () => {
      const alice = await createStudent();

      const res = await request
        .get(`${API}/gamification/weekly-challenges`)
        .set(auth(alice.token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /gamification/seasonal-events', () => {
    it('returns list of seasonal events', async () => {
      const alice = await createStudent();

      const res = await request
        .get(`${API}/gamification/seasonal-events`)
        .set(auth(alice.token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
