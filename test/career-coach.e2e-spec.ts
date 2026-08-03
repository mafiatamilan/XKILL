import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { AiService } from '../src/ai/ai.service';
import { FakeCareerCoachAiService } from './support/fake-career-coach-ai-service';

const API = '/api/v1';

describe('AI Career Coach (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [
      { token: AiService, useClass: FakeCareerCoachAiService },
    ]);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (role: string) => {
    const user = await factory.createUser({ role });
    const res = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: res.body.accessToken as string };
  };

  const createStudent = () => login('student');

  const addCareerGoal = (token: string, overrides: Record<string, unknown> = {}) =>
    request
      .post(`${API}/students/me/career-goals`)
      .set(auth(token))
      .send({
        title: 'Become a backend engineer',
        targetRole: 'Backend Engineer',
        targetCompanies: ['Google'],
        industries: ['fintech'],
        ...overrides,
      });

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/career-coach/roadmap`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const faculty = await login('faculty');
      await request.get(`${API}/career-coach/roadmap`).set(auth(faculty.token)).expect(403);
    });
  });

  describe('roadmap', () => {
    it('returns 404 CAREER_GOAL_REQUIRED without an active goal', async () => {
      const { token } = await createStudent();
      const res = await request.get(`${API}/career-coach/roadmap`).set(auth(token)).expect(404);
      expect(res.body.code).toBe('CAREER_GOAL_REQUIRED');
    });

    it('returns a 5-phase roadmap anchored on the active career goal', async () => {
      const { token } = await createStudent();
      await addCareerGoal(token).expect(201);
      const res = await request.get(`${API}/career-coach/roadmap`).set(auth(token)).expect(200);
      expect(res.body.totalMonths).toBeGreaterThanOrEqual(3);
      expect(res.body.phases).toHaveLength(5);
      expect(res.body.phases[0]).toMatchObject({ phase: 1, title: expect.any(String) });
      expect(res.body.phases[0].focus).toContain('System Design');
    });
  });

  describe('skill-gap and recommendations', () => {
    it('reports the deterministic skill gap for the target role', async () => {
      const { token } = await createStudent();
      await addCareerGoal(token).expect(201);
      await request
        .post(`${API}/students/me/skills`)
        .set(auth(token))
        .send({
          name: 'SQL',
          category: 'database',
          proficiencyLevel: 'intermediate',
          yearsOfExperience: 1,
          isPrimary: true,
        })
        .expect(201);
      const res = await request.get(`${API}/career-coach/skill-gap`).set(auth(token)).expect(200);
      expect(res.body.targetRole).toBe('Backend Engineer');
      expect(res.body.present).toContain('SQL');
      expect(res.body.missing).toContain('System Design');
      expect(res.body.coverage).toBeGreaterThan(0);
      expect(res.body.coverage).toBeLessThan(1);
    });

    it('returns learning recommendations closing the skill gaps', async () => {
      const { token } = await createStudent();
      await addCareerGoal(token).expect(201);
      const res = await request
        .get(`${API}/career-coach/recommendations`)
        .set(auth(token))
        .expect(200);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.recommendations[0]).toMatchObject({ skill: expect.any(String) });
      expect(res.body.gap.missing.length).toBeGreaterThan(0);
    });
  });

  describe('salary prediction', () => {
    it('returns a marked-as-estimate personalized prediction', async () => {
      const { token } = await createStudent();
      await addCareerGoal(token).expect(201);
      const res = await request
        .get(`${API}/career-coach/salary-prediction`)
        .set(auth(token))
        .expect(200);
      expect(res.body.isEstimate).toBe(true);
      expect(res.body.totalCtcLakhs).toBe(28);
      expect(res.body.confidence).toBe(72);
      expect(res.body.factors.length).toBeGreaterThan(0);
    });

    it('persists the prediction for the user', async () => {
      const { token, user } = await createStudent();
      await addCareerGoal(token).expect(201);
      await request.get(`${API}/career-coach/salary-prediction`).set(auth(token)).expect(200);
      const saved = await db.prisma.salaryPrediction.findUnique({
        where: { userId: user.id },
      });
      expect(saved).toBeTruthy();
      expect(saved?.totalCtcLakhs).toBe(28);
    });
  });

  describe('chat', () => {
    it('persists user and assistant messages on a resolved call', async () => {
      const { token, user } = await createStudent();
      const res = await request
        .post(`${API}/career-coach/chat`)
        .set(auth(token))
        .send({ message: 'How should I prep for backend roles?' })
        .expect(201);
      expect(res.body.reply).toContain('Coaching reply');
      const messages = await db.prisma.careerChatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('persists nothing when the AI call fails', async () => {
      const { token, user } = await createStudent();
      await request
        .post(`${API}/career-coach/chat`)
        .set(auth(token))
        .send({ message: 'FORCE_AI_FAILURE trigger' })
        .expect(502);
      const messages = await db.prisma.careerChatMessage.count({
        where: { userId: user.id },
      });
      expect(messages).toBe(0);
    });

    it('rejects an empty message', async () => {
      const { token } = await createStudent();
      await request
        .post(`${API}/career-coach/chat`)
        .set(auth(token))
        .send({ message: '   ' })
        .expect(400);
    });

    it('lists chat history with pagination', async () => {
      const { token } = await createStudent();
      await request
        .post(`${API}/career-coach/chat`)
        .set(auth(token))
        .send({ message: 'first question' })
        .expect(201);
      await request
        .post(`${API}/career-coach/chat`)
        .set(auth(token))
        .send({ message: 'second question' })
        .expect(201);
      const res = await request.get(`${API}/career-coach/chat`).set(auth(token)).expect(200);
      expect(res.body.meta.total).toBe(4);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data[0]).toMatchObject({
        role: expect.any(String),
        content: expect.any(String),
      });
    });
  });
});
