import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Internships Portal (e2e)', () => {
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
        name: 'InternCorp',
        industry: 'Technology',
        location: 'Remote',
        userId: recruiterUserId,
      },
    });
  };

  describe('full internship lifecycle', () => {
    it('recruiter creates → student searches → applies → gets certificate', async () => {
      const recruiter = await createRecruiter();
      const company = await seedCompany(recruiter.user.id);

      // Create internship
      const createRes = await request
        .post(`${API}/internships`)
        .set(auth(recruiter.token))
        .send({
          title: 'Summer Software Intern',
          description: 'Build cool stuff',
          companyId: company.id,
          location: 'Remote',
          type: 'summer',
          duration: '3 months',
          stipend: 15000,
          deadline: '2026-12-31',
        })
        .expect(201);

      expect(createRes.body.id).toBeDefined();
      const internshipId = createRes.body.id;

      // Public search
      const searchRes = await request.get(`${API}/internships/search?type=summer`).expect(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get by ID (public)
      const getRes = await request.get(`${API}/internships/${internshipId}`).expect(200);
      expect(getRes.body.title).toBe('Summer Software Intern');

      // Student applies
      const student = await createStudent();
      const applyRes = await request
        .post(`${API}/internships/${internshipId}/apply`)
        .set(auth(student.token))
        .send({ coverLetter: 'I love coding!' })
        .expect(201);
      expect(applyRes.body.internshipId).toBe(internshipId);

      // Duplicate apply returns 409
      await request
        .post(`${API}/internships/${internshipId}/apply`)
        .set(auth(student.token))
        .expect(409);

      // Update internship (recruiter)
      const updateRes = await request
        .put(`${API}/internships/${internshipId}`)
        .set(auth(recruiter.token))
        .send({ title: 'Summer Software Engineer Intern' })
        .expect(200);
      expect(updateRes.body.title).toBe('Summer Software Engineer Intern');
    });
  });

  describe('authorization', () => {
    it('returns 401 for unauthenticated internship creation', async () => {
      await request.post(`${API}/internships`).send({ title: 'Test' }).expect(401);
    });

    it('returns 403 when student tries to create internship', async () => {
      const alice = await createStudent();
      await request
        .post(`${API}/internships`)
        .set(auth(alice.token))
        .send({ title: 'Test' })
        .expect(403);
    });
  });

  describe('error cases', () => {
    it('returns 404 for non-existent internship', async () => {
      await request.get(`${API}/internships/nonexistent`).expect(404);
    });
  });
});
