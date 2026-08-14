import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Company Prep Paths (e2e)', () => {
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
    const user = await factory.createUser({ role: 'college_admin' });
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
    it('returns 401 for unauthenticated company creation', async () => {
      await request.post(`${API}/company-prep`).send({ companyName: 'Test' }).expect(401);
    });

    it('returns 403 when student tries to create company', async () => {
      const student = await createStudent();
      await request
        .post(`${API}/company-prep`)
        .set(auth(student.token))
        .send({ companyName: 'Test' })
        .expect(403);
    });
  });

  describe('full lifecycle', () => {
    it('admin creates company → adds patterns/questions/assessments/salary/timeline → student views', async () => {
      const admin = await createAdmin();

      // Create company
      const createRes = await request
        .post(`${API}/company-prep`)
        .set(auth(admin.token))
        .send({
          companyName: 'Google',
          industry: 'Technology',
          headquarters: 'Mountain View, CA',
          description: 'Top tech company',
        })
        .expect(201);
      expect(createRes.body.slug).toBe('google');

      // Duplicate returns 409
      await request
        .post(`${API}/company-prep`)
        .set(auth(admin.token))
        .send({ companyName: 'Google' })
        .expect(409);

      // Public search
      const searchRes = await request.get(`${API}/company-prep?q=google`).expect(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get full prep path
      const fullRes = await request.get(`${API}/company-prep/google`).expect(200);
      expect(fullRes.body.companyName).toBe('Google');

      // Update company
      const updateRes = await request
        .put(`${API}/company-prep/google`)
        .set(auth(admin.token))
        .send({ description: 'Updated description' })
        .expect(200);
      expect(updateRes.body.description).toBe('Updated description');

      // Add hiring patterns
      const patternRes = await request
        .post(`${API}/company-prep/google/hiring-patterns`)
        .set(auth(admin.token))
        .send({
          roundName: 'Online Assessment',
          roundOrder: 1,
          description: '60 min coding test',
          durationMinutes: 60,
        })
        .expect(201);
      expect(patternRes.body.roundName).toBe('Online Assessment');

      // List patterns
      const patternsRes = await request
        .get(`${API}/company-prep/google/hiring-patterns`)
        .expect(200);
      expect(patternsRes.body.length).toBe(1);

      // Add interview questions
      const questionRes = await request
        .post(`${API}/company-prep/google/questions`)
        .set(auth(admin.token))
        .send({
          question: 'Explain the difference between TCP and UDP.',
          category: 'technical',
          difficulty: 'medium',
          frequency: 'very-common',
        })
        .expect(201);
      expect(questionRes.body.category).toBe('technical');

      // Add online assessment
      const assessmentRes = await request
        .post(`${API}/company-prep/google/assessments`)
        .set(auth(admin.token))
        .send({
          platform: 'HackerRank',
          durationMinutes: 90,
          totalQuestions: 5,
          topics: ['dsa', 'os', 'cn'],
        })
        .expect(201);
      expect(assessmentRes.body.platform).toBe('HackerRank');

      // Add salary insight
      const salaryRes = await request
        .post(`${API}/company-prep/google/salary-insights`)
        .set(auth(admin.token))
        .send({
          role: 'Software Engineer',
          experienceLevel: 'fresher',
          ctcMin: 12,
          ctcMax: 25,
          ctcMedian: 18,
        })
        .expect(201);
      expect(salaryRes.body.ctcMin).toBe(12);

      // Add prep timeline
      const timelineRes = await request
        .post(`${API}/company-prep/google/timelines`)
        .set(auth(admin.token))
        .send({
          weekNumber: 1,
          title: 'Week 1: DSA Foundations',
          tasks: ['Solve 5 DSA problems daily', 'Read system design blog'],
          focusAreas: ['dsa', 'system-design'],
        })
        .expect(201);
      expect(timelineRes.body.weekNumber).toBe(1);

      // Student views full prep path
      const student = await createStudent();
      const studentView = await request
        .get(`${API}/company-prep/google`)
        .set(auth(student.token))
        .expect(200);
      expect(studentView.body.hiringPatterns.length).toBe(1);
      expect(studentView.body.interviewQuestions.length).toBe(1);
      expect(studentView.body.onlineAssessments.length).toBe(1);
      expect(studentView.body.salaryInsights.length).toBe(1);
      expect(studentView.body.prepTimelines.length).toBe(1);
    });
  });
});
