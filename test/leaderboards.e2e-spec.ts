import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Leaderboards (e2e)', () => {
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

  const createStudent = async (
    overrides: { collegeName?: string; department?: string; city?: string } = {},
  ) => {
    const user = await factory.createUser({ role: 'student' });
    if (overrides.collegeName || overrides.department || overrides.city) {
      await db.prisma.studentProfile.create({
        data: {
          userId: user.id,
          collegeName: overrides.collegeName,
          department: overrides.department,
          city: overrides.city,
        },
      });
    }
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  const setRating = async (userId: string, rating: number) => {
    await db.prisma.codingRating.upsert({
      where: { userId },
      create: { userId, rating, bestRating: rating, contestsParticipated: 1 },
      update: { rating, bestRating: rating },
    });
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/leaderboards/global`).expect(401);
    });

    it('returns 403 for non-allowed roles', async () => {
      const user = await factory.createUser({ role: 'recruiter' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .get(`${API}/leaderboards/global`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('GET /leaderboards/global', () => {
    it('returns ranked users with pagination', async () => {
      const alice = await createStudent();
      const bob = await createStudent();
      await setRating(alice.user.id, 1400);
      await setRating(bob.user.id, 1200);

      const res = await request
        .get(`${API}/leaderboards/global`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('global');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      // Higher rating should be first
      if (res.body.data.length >= 2) {
        expect(res.body.data[0].score).toBeGreaterThanOrEqual(res.body.data[1].score);
      }
    });
  });

  describe('GET /leaderboards/college/:id', () => {
    it('returns college-scoped leaderboard', async () => {
      const alice = await createStudent({ collegeName: 'MIT' });
      const bob = await createStudent({ collegeName: 'MIT' });
      const charlie = await createStudent({ collegeName: 'Stanford' });
      await setRating(alice.user.id, 1500);
      await setRating(bob.user.id, 1300);
      await setRating(charlie.user.id, 1600);

      const res = await request
        .get(`${API}/leaderboards/college/MIT`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('college');
      expect(res.body.collegeName).toBe('MIT');
      expect(res.body.data).toHaveLength(2);
      expect(
        res.body.data.every((e: { userId: string }) =>
          [alice.user.id, bob.user.id].includes(e.userId),
        ),
      ).toBe(true);
    });
  });

  describe('GET /leaderboards/department/:id', () => {
    it('returns department-scoped leaderboard', async () => {
      const alice = await createStudent({ department: 'CS' });
      const bob = await createStudent({ department: 'CS' });
      await setRating(alice.user.id, 1400);
      await setRating(bob.user.id, 1200);

      const res = await request
        .get(`${API}/leaderboards/department/CS`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('department');
      expect(res.body.department).toBe('CS');
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /leaderboards/weekly', () => {
    it('returns weekly top gainers', async () => {
      const alice = await createStudent();
      const res = await request
        .get(`${API}/leaderboards/weekly`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('weekly');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('GET /leaderboards/monthly', () => {
    it('returns monthly top gainers', async () => {
      const alice = await createStudent();
      const res = await request
        .get(`${API}/leaderboards/monthly`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('monthly');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /leaderboards/nearby-me', () => {
    it('returns city-scoped leaderboard for user with city set', async () => {
      const alice = await createStudent({ city: 'Boston' });
      const bob = await createStudent({ city: 'Boston' });
      await setRating(alice.user.id, 1400);
      await setRating(bob.user.id, 1200);

      const res = await request
        .get(`${API}/leaderboards/nearby-me`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.scope).toBe('nearby');
      expect(res.body.city).toBe('Boston');
      expect(res.body.data).toHaveLength(2);
    });

    it('returns 404 for user without city', async () => {
      const alice = await createStudent();
      await request.get(`${API}/leaderboards/nearby-me`).set(auth(alice.token)).expect(404);
    });
  });
});
