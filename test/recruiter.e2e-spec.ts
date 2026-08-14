import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Recruiter Portal (e2e)', () => {
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

  const createRecruiter = async () => {
    const user = await factory.createUser({ role: 'recruiter' });
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
    it('returns 401 for unauthenticated profile creation', async () => {
      await request.post(`${API}/recruiter/profile`).send({}).expect(401);
    });

    it('returns 403 when student tries to create recruiter profile', async () => {
      const student = await createStudent();
      await request.post(`${API}/recruiter/profile`).set(auth(student.token)).send({}).expect(403);
    });
  });

  describe('full lifecycle', () => {
    it('creates profile → shortlists candidate → schedules interview → analytics', async () => {
      const recruiter = await createRecruiter();

      // Create profile
      const profileRes = await request
        .post(`${API}/recruiter/profile`)
        .set(auth(recruiter.token))
        .send({ jobTitle: 'Senior Technical Recruiter', phone: '+91-9876543210' })
        .expect(201);
      expect(profileRes.body.jobTitle).toBe('Senior Technical Recruiter');

      // Duplicate returns 409
      await request
        .post(`${API}/recruiter/profile`)
        .set(auth(recruiter.token))
        .send({})
        .expect(409);

      // Get profile
      const getProfileRes = await request
        .get(`${API}/recruiter/profile`)
        .set(auth(recruiter.token))
        .expect(200);
      expect(getProfileRes.body.jobTitle).toBe('Senior Technical Recruiter');

      // Update profile
      const updateRes = await request
        .put(`${API}/recruiter/profile`)
        .set(auth(recruiter.token))
        .send({ jobTitle: 'Lead Recruiter' })
        .expect(200);
      expect(updateRes.body.jobTitle).toBe('Lead Recruiter');

      // Dashboard (empty)
      const dashRes = await request
        .get(`${API}/recruiter/dashboard`)
        .set(auth(recruiter.token))
        .expect(200);
      expect(dashRes.body.totalJobs).toBe(0);

      // Create a student to shortlist
      const student = await createStudent();

      // Shortlist student
      const shortlistRes = await request
        .post(`${API}/recruiter/shortlist/${student.user.id}`)
        .set(auth(recruiter.token))
        .send({ notes: 'Strong candidate' })
        .expect(201);
      expect(shortlistRes.body.status).toBe('shortlisted');

      // Duplicate shortlist returns 409
      await request
        .post(`${API}/recruiter/shortlist/${student.user.id}`)
        .set(auth(recruiter.token))
        .send({})
        .expect(409);

      // List shortlists
      const listShortRes = await request
        .get(`${API}/recruiter/shortlist`)
        .set(auth(recruiter.token))
        .expect(200);
      expect(listShortRes.body.length).toBeGreaterThanOrEqual(1);

      // Schedule interview
      const interviewRes = await request
        .post(`${API}/recruiter/interviews`)
        .set(auth(recruiter.token))
        .send({
          candidateId: student.user.id,
          scheduledAt: '2026-08-25T10:00:00.000Z',
          durationMinutes: 60,
          type: 'virtual',
        })
        .expect(201);
      expect(interviewRes.body.type).toBe('virtual');

      // List interviews
      const listInterviews = await request
        .get(`${API}/recruiter/interviews`)
        .set(auth(recruiter.token))
        .expect(200);
      expect(listInterviews.body.length).toBe(1);

      // Complete interview
      const updateInterview = await request
        .put(`${API}/recruiter/interviews/${interviewRes.body.id}`)
        .set(auth(recruiter.token))
        .send({ status: 'completed', rating: 4, feedback: 'Good technical skills' })
        .expect(200);
      expect(updateInterview.body.rating).toBe(4);

      // Analytics
      const analyticsRes = await request
        .get(`${API}/recruiter/analytics`)
        .set(auth(recruiter.token))
        .expect(200);
      expect(analyticsRes.body.totalShortlisted).toBe(1);
      expect(analyticsRes.body.averageRating).toBe(4);
    });
  });
});
