import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { AiService } from '../src/ai/ai.service';
import { FakeAiService } from './support/fake-ai-service';

const API = '/api/v1';

describe('Placement Prep (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [{ token: AiService, useClass: FakeAiService }]);
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

  const seedSkillsAndGoal = async (userId: string) => {
    await db.prisma.skillProfile.create({
      data: { userId, name: 'Java', category: 'programming', proficiencyLevel: 'intermediate' },
    });
    await db.prisma.careerGoal.create({
      data: {
        userId,
        title: 'SDE at Google',
        targetRole: 'Software Engineer',
        targetCompanies: ['Google'],
        status: 'active',
      },
    });
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/placement/roadmap`).expect(401);
      await request.get(`${API}/placement/daily-challenge`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const user = await factory.createUser({ role: 'faculty' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .get(`${API}/placement/roadmap`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('roadmap', () => {
    it('generates a personalized 10-week roadmap on first access', async () => {
      const { user, token } = await createStudent();
      await seedSkillsAndGoal(user.id);

      const res = await request.get(`${API}/placement/roadmap`).set(auth(token)).expect(200);

      expect(res.body.weeks).toHaveLength(10);
      expect(res.body.weeks[0].tasks).toHaveLength(7);
      expect(res.body.overallPercent).toBe(0);
      const companyWeek = res.body.weeks.find(
        (week: { tasks: Array<{ taskType: string; reference: string }> }) =>
          week.tasks.some((t) => t.taskType === 'company'),
      );
      expect(companyWeek.tasks[0].reference).toBe('Google');
    });

    it('returns the persisted roadmap on subsequent access', async () => {
      const { user, token } = await createStudent();
      await seedSkillsAndGoal(user.id);
      const first = await request.get(`${API}/placement/roadmap`).set(auth(token)).expect(200);
      const second = await request.get(`${API}/placement/roadmap`).set(auth(token)).expect(200);
      expect(second.body.weeks).toHaveLength(10);
      expect(second.body.weeks[0].id).toBe(first.body.weeks[0].id);
    });

    it('returns 404 for an out-of-range week', async () => {
      const { token } = await createStudent();
      await request.get(`${API}/placement/roadmap`).set(auth(token)).expect(200);
      await request.get(`${API}/placement/roadmap/99/tasks`).set(auth(token)).expect(404);
    });
  });

  describe('tasks', () => {
    it('lists the tasks for a week and completes one', async () => {
      const { user, token } = await createStudent();
      await seedSkillsAndGoal(user.id);
      const roadmap = await request.get(`${API}/placement/roadmap`).set(auth(token)).expect(200);
      const week = roadmap.body.weeks[0];

      const tasks = await request
        .get(`${API}/placement/roadmap/${week.weekNumber}/tasks`)
        .set(auth(token))
        .expect(200);
      expect(tasks.body.tasks).toHaveLength(7);
      const taskId = tasks.body.tasks[0].id;

      const completed = await request
        .patch(`${API}/placement/tasks/${taskId}/complete`)
        .set(auth(token))
        .expect(200);
      expect(completed.body.isCompleted).toBe(true);
      expect(completed.body.completedAt).toBeDefined();

      const progress = await request.get(`${API}/placement/progress`).set(auth(token)).expect(200);
      expect(progress.body.completedTasks).toBe(1);
    });

    it('returns 404 when completing a task that does not exist', async () => {
      const { token } = await createStudent();
      await request
        .patch(`${API}/placement/tasks/nonexistent-task/complete`)
        .set(auth(token))
        .expect(404);
    });
  });

  describe('companies', () => {
    it('returns 404 for an unknown company', async () => {
      const { token } = await createStudent();
      await request.get(`${API}/placement/companies/UnknownCorp/prep`).set(auth(token)).expect(404);
    });
  });

  describe('readiness prediction', () => {
    it('computes a placement prediction from the 5.2 readiness score', async () => {
      const { user, token } = await createStudent();
      await db.prisma.readinessScore.create({
        data: {
          userId: user.id,
          overall: 82,
          components: { profile: 90, skills: 80, careerGoal: 85, activity: 70 },
        },
      });
      await db.prisma.careerGoal.create({
        data: {
          userId: user.id,
          title: 'SDE',
          targetRole: 'SDE',
          targetCompanies: ['Google'],
          status: 'active',
        },
      });

      const res = await request
        .get(`${API}/placement/readiness-prediction`)
        .set(auth(token))
        .expect(200);
      expect(res.body.readinessScore).toBe(82);
      expect(res.body.predictedLevel).toBe('medium');
      expect(res.body.reasons).toContain('strong readiness score');
    });

    it('handles a student with no readiness score yet', async () => {
      const { token } = await createStudent();
      const res = await request
        .get(`${API}/placement/readiness-prediction`)
        .set(auth(token))
        .expect(200);
      expect(res.body.readinessScore).toBe(0);
      expect(res.body.predictedLevel).toBe('low');
    });
  });

  describe('daily challenge', () => {
    it('returns the daily challenge for today', async () => {
      const { token } = await createStudent();
      const res = await request
        .get(`${API}/placement/daily-challenge`)
        .set(auth(token))
        .expect(200);
      expect(res.body.title).toBeDefined();
      expect(res.body.taskType).toBeDefined();
    });
  });

  describe('study planner', () => {
    it('generates and persists a study plan via the fake AI service', async () => {
      const { user, token } = await createStudent();
      await seedSkillsAndGoal(user.id);
      const res = await request
        .post(`${API}/placement/study-planner/generate`)
        .set(auth(token))
        .send({ targetRole: 'SDE', targetCompanies: ['Google'], weeks: 4 })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('SDE Placement Plan');
      expect(res.body.plan.weeks).toHaveLength(2);
    });

    it('rejects 400 for a missing target role', async () => {
      const { token } = await createStudent();
      await request
        .post(`${API}/placement/study-planner/generate`)
        .set(auth(token))
        .send({ weeks: 4 })
        .expect(400);
    });
  });
});
