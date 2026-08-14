import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Faculty Portal (e2e)', () => {
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

  const createFaculty = async () => {
    const user = await factory.createUser({ role: 'faculty' });
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
    it('returns 401 for unauthenticated dashboard access', async () => {
      await request.get(`${API}/faculty/dashboard`).expect(401);
    });

    it('returns 403 when student tries to access faculty dashboard', async () => {
      const student = await createStudent();
      await request.get(`${API}/faculty/dashboard`).set(auth(student.token)).expect(403);
    });
  });

  describe('full lifecycle', () => {
    it('gets dashboard → gets reports → broadcasts notification', async () => {
      const faculty = await createFaculty();

      // Dashboard (empty - no subjects assigned)
      const dashRes = await request
        .get(`${API}/faculty/dashboard`)
        .set(auth(faculty.token))
        .expect(200);
      expect(dashRes.body.subjects).toBeDefined();
      expect(dashRes.body.totalStudents).toBe(0);

      // Reports (empty)
      const reportsRes = await request
        .get(`${API}/faculty/reports`)
        .set(auth(faculty.token))
        .expect(200);
      expect(reportsRes.body.subjects).toBeDefined();

      // Broadcast notification to all students
      const broadcastRes = await request
        .post(`${API}/faculty/notifications/broadcast`)
        .set(auth(faculty.token))
        .send({
          title: 'Exam Schedule Update',
          message: 'Midterm has been rescheduled to next week.',
        })
        .expect(201);
      expect(broadcastRes.body.sentTo).toBeGreaterThanOrEqual(0);
      expect(broadcastRes.body.title).toBe('Exam Schedule Update');

      // Broadcast with target groups
      const targetedRes = await request
        .post(`${API}/faculty/notifications/broadcast`)
        .set(auth(faculty.token))
        .send({
          title: 'CS Department Meeting',
          message: 'Mandatory meeting for CS students.',
          targetGroups: ['CS'],
        })
        .expect(201);
      expect(targetedRes.body.sentTo).toBeGreaterThanOrEqual(0);
    });
  });
});
