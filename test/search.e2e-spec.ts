import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Search & Discovery (e2e)', () => {
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

  describe('authorization', () => {
    it('returns 401 for unauthenticated search', async () => {
      await request.get(`${API}/search?q=test`).expect(401);
    });
  });

  describe('unified search', () => {
    it('returns search results for a valid query', async () => {
      const student = await createStudent();

      const res = await request.get(`${API}/search?q=test`).set(auth(student.token)).expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.query).toBe('test');
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.types).toBeDefined();
    });

    it('returns 400 for empty query', async () => {
      const student = await createStudent();

      await request.get(`${API}/search?q=`).set(auth(student.token)).expect(400);
    });

    it('filters by type', async () => {
      const student = await createStudent();

      const res = await request
        .get(`${API}/search?q=test&type=problem`)
        .set(auth(student.token))
        .expect(200);

      expect(res.body.data).toBeDefined();
      for (const item of res.body.data) {
        expect(item.type).toBe('problem');
      }
    });

    it('respects limit parameter', async () => {
      const student = await createStudent();

      const res = await request
        .get(`${API}/search?q=test&limit=5`)
        .set(auth(student.token))
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('returns 400 for invalid type', async () => {
      const student = await createStudent();

      await request.get(`${API}/search?q=test&type=invalid`).set(auth(student.token)).expect(400);
    });

    it('searches across all types when no type specified', async () => {
      const student = await createStudent();

      const res = await request.get(`${API}/search?q=a`).set(auth(student.token)).expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.types).toBeDefined();
    });

    it('returns correct response shape', async () => {
      const student = await createStudent();

      const res = await request.get(`${API}/search?q=test`).set(auth(student.token)).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('query');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('types');

      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('similarity');
        expect(item).toHaveProperty('metadata');
      }
    });
  });
});
