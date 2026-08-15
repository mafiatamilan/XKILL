import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Analytics & Reporting (e2e)', () => {
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

  describe('authorization', () => {
    it('returns 401 for unauthenticated analytics access', async () => {
      await request.get(`${API}/analytics/student/some-id`).expect(401);
    });

    it('returns 403 when student tries to access admin analytics', async () => {
      const student = await createStudent();
      await request.get(`${API}/analytics/student/some-id`).set(auth(student.token)).expect(403);
    });
  });

  describe('student analytics', () => {
    it('returns student analytics for admin', async () => {
      const admin = await createAdmin();
      const student = await createStudent();

      // Create a student profile for the test user
      await db.prisma.studentProfile.create({
        data: {
          userId: student.user.id,
          department: 'Computer Science',
          collegeName: 'Test College',
        },
      });

      const res = await request
        .get(`${API}/analytics/student/${student.user.id}`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.studentId).toBe(student.user.id);
      expect(res.body.academics).toBeDefined();
      expect(res.body.dsa).toBeDefined();
      expect(res.body.gamification).toBeDefined();
      expect(res.body.placement).toBeDefined();
      expect(res.body.certificates).toBeDefined();
      expect(res.body.interviews).toBeDefined();
    });

    it('returns 404 for unknown student', async () => {
      const admin = await createAdmin();
      await request.get(`${API}/analytics/student/nonexistent`).set(auth(admin.token)).expect(404);
    });
  });

  describe('placement analytics', () => {
    it('returns placement analytics for admin', async () => {
      const admin = await createAdmin();

      const res = await request
        .get(`${API}/analytics/placement`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.overview).toBeDefined();
      expect(res.body.byDepartment).toBeDefined();
      expect(res.body.topRecruiters).toBeDefined();
    });
  });

  describe('college analytics', () => {
    it('returns college analytics for admin', async () => {
      const admin = await createAdmin();

      const res = await request
        .get(`${API}/analytics/college/some-id`)
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.overview).toBeDefined();
      expect(res.body.departments).toBeDefined();
    });
  });

  describe('revenue analytics', () => {
    it('returns revenue analytics for admin', async () => {
      const admin = await createAdmin();

      const res = await request.get(`${API}/analytics/revenue`).set(auth(admin.token)).expect(200);

      expect(res.body.totalCertificates).toBeDefined();
      expect(res.body.recentCertificates).toBeDefined();
      expect(res.body.totalBookings).toBeDefined();
    });
  });

  describe('custom report', () => {
    it('generates a JSON custom report', async () => {
      const admin = await createAdmin();

      const res = await request
        .post(`${API}/analytics/custom-report`)
        .set(auth(admin.token))
        .send({
          entity: 'user',
          fields: ['id', 'fullName', 'email'],
          limit: 10,
        })
        .expect(201);

      expect(res.body.entity).toBe('user');
      expect(res.body.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('generates a CSV custom report', async () => {
      const admin = await createAdmin();

      const res = await request
        .post(`${API}/analytics/custom-report`)
        .set(auth(admin.token))
        .send({
          entity: 'user',
          fields: ['id', 'fullName'],
          format: 'csv',
          limit: 5,
        })
        .expect(201);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('returns 403 when student tries to generate custom report', async () => {
      const student = await createStudent();

      await request
        .post(`${API}/analytics/custom-report`)
        .set(auth(student.token))
        .send({
          entity: 'user',
          fields: ['id'],
        })
        .expect(403);
    });
  });
});
