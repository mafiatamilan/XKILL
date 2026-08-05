import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Jobs Marketplace (e2e)', () => {
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

  const seedCompany = async (recruiterUserId: string) => {
    return db.prisma.companyProfile.create({
      data: {
        name: 'TestCorp',
        industry: 'Technology',
        location: 'Bangalore',
        userId: recruiterUserId,
      },
    });
  };

  describe('authorization', () => {
    it('returns 401 for unauthenticated job creation', async () => {
      await request.post(`${API}/jobs`).send({ title: 'Test' }).expect(401);
    });

    it('returns 403 when student tries to create a job', async () => {
      const alice = await createStudent();
      await request.post(`${API}/jobs`).set(auth(alice.token)).send({ title: 'Test' }).expect(403);
    });
  });

  describe('full job lifecycle', () => {
    it('recruiter creates → student searches → applies → saves → checks eligibility', async () => {
      const recruiter = await createRecruiter();
      const company = await seedCompany(recruiter.user.id);

      // Create job
      const createRes = await request
        .post(`${API}/jobs`)
        .set(auth(recruiter.token))
        .send({
          title: 'Senior Frontend Developer',
          description: 'Build amazing UIs',
          companyId: company.id,
          location: 'Bangalore',
          type: 'full_time',
          salaryMin: 500000,
          salaryMax: 1200000,
          skills: ['React', 'TypeScript'],
          deadline: '2026-12-31',
        })
        .expect(201);

      expect(createRes.body.id).toBeDefined();
      const jobId = createRes.body.id;

      // Public search
      const searchRes = await request.get(`${API}/jobs/search?q=Frontend`).expect(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get job by ID (public)
      const getRes = await request.get(`${API}/jobs/${jobId}`).expect(200);
      expect(getRes.body.title).toBe('Senior Frontend Developer');
      expect(getRes.body.applicationCount).toBe(0);

      // Student applies
      const student = await createStudent();
      const applyRes = await request
        .post(`${API}/jobs/${jobId}/apply`)
        .set(auth(student.token))
        .send({ coverLetter: 'I am a great fit!' })
        .expect(201);
      expect(applyRes.body.jobId).toBe(jobId);

      // List my applications
      const appsRes = await request
        .get(`${API}/jobs/me/applications`)
        .set(auth(student.token))
        .expect(200);
      expect(appsRes.body.length).toBeGreaterThanOrEqual(1);

      // Save job
      const saveRes = await request
        .post(`${API}/jobs/${jobId}/save`)
        .set(auth(student.token))
        .expect(201);
      expect(saveRes.body.jobId).toBe(jobId);

      // Duplicate save returns 409
      await request.post(`${API}/jobs/${jobId}/save`).set(auth(student.token)).expect(409);

      // Check eligibility
      const eligRes = await request
        .get(`${API}/jobs/${jobId}/eligibility-check`)
        .set(auth(student.token))
        .expect(200);
      expect(eligRes.body.jobId).toBe(jobId);

      // Contact recruiter
      const contactRes = await request
        .post(`${API}/jobs/${jobId}/contact-recruiter`)
        .set(auth(student.token))
        .expect(201);
      expect(contactRes.body.recruiterName).toBeDefined();
      expect(contactRes.body.companyName).toBe('TestCorp');

      // Unsave
      await request.delete(`${API}/jobs/${jobId}/save`).set(auth(student.token)).expect(200);

      // Update job (recruiter)
      const updateRes = await request
        .put(`${API}/jobs/${jobId}`)
        .set(auth(recruiter.token))
        .send({ title: 'Senior Frontend Engineer' })
        .expect(200);
      expect(updateRes.body.title).toBe('Senior Frontend Engineer');

      // Get company profile (public)
      const companyRes = await request.get(`${API}/companies/${company.id}/profile`).expect(200);
      expect(companyRes.body.name).toBe('TestCorp');
      expect(companyRes.body.activeJobCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('error cases', () => {
    it('returns 404 for non-existent job', async () => {
      await request.get(`${API}/jobs/nonexistent`).expect(404);
    });

    it('returns 404 for non-existent company', async () => {
      await request.get(`${API}/companies/nonexistent/profile`).expect(404);
    });
  });
});
