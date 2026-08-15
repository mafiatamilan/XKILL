import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { AiService } from '../src/ai/ai.service';
import { FakeAiEndpointService } from './support/fake-ai-endpoint-service';

const API = '/api/v1';

describe('AI Services (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;
  let studentToken: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [{ token: AiService, useClass: FakeAiEndpointService }]);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);

    const user = await factory.createUser({ role: 'student' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    studentToken = login.body.accessToken;
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  // ── POST /ai/tutor/ask ──

  describe('POST /ai/tutor/ask', () => {
    it('returns a tutor answer', async () => {
      const res = await request
        .post(`${API}/ai/tutor/ask`)
        .set(auth(studentToken))
        .send({ question: 'What is recursion?', topic: 'Fundamentals' })
        .expect(200);

      expect(res.body.answer).toBeDefined();
      expect(res.body.relatedTopics).toBeInstanceOf(Array);
      expect(res.body.followUpQuestions).toBeInstanceOf(Array);
    });

    it('returns 401 without auth', async () => {
      await request.post(`${API}/ai/tutor/ask`).send({ question: 'Hello?' }).expect(401);
    });

    it('returns 400 for missing question', async () => {
      await request.post(`${API}/ai/tutor/ask`).set(auth(studentToken)).send({}).expect(400);
    });
  });

  // ── POST /ai/doubt-solver ──

  describe('POST /ai/doubt-solver', () => {
    it('returns a doubt solution', async () => {
      const res = await request
        .post(`${API}/ai/doubt-solver`)
        .set(auth(studentToken))
        .send({
          doubt: 'My function returns wrong output',
          topic: 'Arrays',
          codeSnippet: 'function twoSum(arr, t) { ... }',
        })
        .expect(200);

      expect(res.body.explanation).toBeDefined();
      expect(res.body.correctedApproach).toBeDefined();
      expect(res.body.keyInsights).toBeInstanceOf(Array);
      expect(res.body.timeComplexity).toBeDefined();
      expect(res.body.spaceComplexity).toBeDefined();
    });

    it('returns 401 without auth', async () => {
      await request.post(`${API}/ai/doubt-solver`).send({ doubt: 'Why?' }).expect(401);
    });
  });

  // ── POST /ai/code-review ──

  describe('POST /ai/code-review', () => {
    it('returns a code review', async () => {
      const res = await request
        .post(`${API}/ai/code-review`)
        .set(auth(studentToken))
        .send({
          code: 'function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) return [i, j];\n    }\n  }\n}',
          language: 'javascript',
          focus: 'time complexity',
        })
        .expect(200);

      expect(res.body.overallAssessment).toBeDefined();
      expect(res.body.issues).toBeInstanceOf(Array);
      expect(res.body.timeComplexity).toBeDefined();
      expect(res.body.spaceComplexity).toBeDefined();
      expect(res.body.strengths).toBeInstanceOf(Array);
      expect(res.body.improvedCode).toBeDefined();
    });

    it('returns 400 for missing code', async () => {
      await request
        .post(`${API}/ai/code-review`)
        .set(auth(studentToken))
        .send({ language: 'javascript' })
        .expect(400);
    });
  });

  // ── POST /ai/resume-analyzer ──

  describe('POST /ai/resume-analyzer', () => {
    it('returns a resume analysis', async () => {
      const res = await request
        .post(`${API}/ai/resume-analyzer`)
        .set(auth(studentToken))
        .send({
          resumeText:
            'John Doe\nSoftware Engineer\nSkills: JavaScript, React, Node.js\nExperience: Built a REST API for a college project',
          targetRole: 'Backend Developer',
        })
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.strengths).toBeInstanceOf(Array);
      expect(res.body.weaknesses).toBeInstanceOf(Array);
      expect(res.body.suggestions).toBeInstanceOf(Array);
      expect(typeof res.body.atsScoreEstimate).toBe('number');
    });
  });

  // ── POST /ai/interview-evaluator ──

  describe('POST /ai/interview-evaluator', () => {
    it('returns an interview evaluation', async () => {
      const res = await request
        .post(`${API}/ai/interview-evaluator`)
        .set(auth(studentToken))
        .send({
          question: 'Tell me about a challenging project you worked on.',
          answer:
            'In my college project, I led a team of 4 to build a real-time chat application using WebSocket and Node.js.',
          interviewType: 'technical',
        })
        .expect(200);

      expect(typeof res.body.score).toBe('number');
      expect(res.body.feedback).toBeDefined();
      expect(res.body.strengths).toBeInstanceOf(Array);
      expect(res.body.improvements).toBeInstanceOf(Array);
      expect(res.body.modelAnswer).toBeDefined();
    });

    it('returns 400 for invalid interview type', async () => {
      await request
        .post(`${API}/ai/interview-evaluator`)
        .set(auth(studentToken))
        .send({
          question: 'Q',
          answer: 'A',
          interviewType: 'invalid-type',
        })
        .expect(400);
    });
  });

  // ── POST /ai/question-generator ──

  describe('POST /ai/question-generator', () => {
    it('generates practice questions', async () => {
      const res = await request
        .post(`${API}/ai/question-generator`)
        .set(auth(studentToken))
        .send({
          topic: 'Dynamic Programming',
          difficulty: 'medium',
          count: 5,
        })
        .expect(200);

      expect(res.body.questions).toBeInstanceOf(Array);
      expect(res.body.questions.length).toBeGreaterThan(0);
      for (const q of res.body.questions) {
        expect(q.question).toBeDefined();
        expect(q.answer).toBeDefined();
        expect(q.explanation).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
      }
    });

    it('returns 400 for count > 20', async () => {
      await request
        .post(`${API}/ai/question-generator`)
        .set(auth(studentToken))
        .send({ topic: 'Arrays', difficulty: 'easy', count: 25 })
        .expect(400);
    });

    it('returns 400 for invalid difficulty', async () => {
      await request
        .post(`${API}/ai/question-generator`)
        .set(auth(studentToken))
        .send({ topic: 'Arrays', difficulty: 'impossible', count: 3 })
        .expect(400);
    });
  });

  // ── POST /ai/study-planner ──

  describe('POST /ai/study-planner', () => {
    it('generates a study plan', async () => {
      const res = await request
        .post(`${API}/ai/study-planner`)
        .set(auth(studentToken))
        .send({
          targetRole: 'Full Stack Developer',
          targetSkills: ['React', 'Node.js'],
          weeks: 4,
          hoursPerWeek: 20,
        })
        .expect(200);

      expect(res.body.title).toBeDefined();
      expect(res.body.overview).toBeDefined();
      expect(res.body.weeks).toBeInstanceOf(Array);
      expect(res.body.weeks.length).toBeGreaterThan(0);
      for (const w of res.body.weeks) {
        expect(typeof w.week).toBe('number');
        expect(w.theme).toBeDefined();
        expect(w.goals).toBeInstanceOf(Array);
        expect(w.activities).toBeInstanceOf(Array);
      }
    });

    it('returns 400 for missing targetRole', async () => {
      await request.post(`${API}/ai/study-planner`).set(auth(studentToken)).send({}).expect(400);
    });
  });
});
