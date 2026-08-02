import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { AiService } from '../src/ai/ai.service';
import { JudgeService } from '../src/judge/judge.service';
import { FakeInterviewAiService } from './support/fake-interview-ai-service';
import { FakeJudgeService } from './support/fake-judge-service';

const API = '/api/v1';

describe('AI Interview Engine (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [
      { token: AiService, useClass: FakeInterviewAiService },
      { token: JudgeService, useClass: FakeJudgeService },
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

  const seedProblem = async () => {
    const problem = await db.prisma.problem.create({
      data: {
        slug: `interview-problem-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Two Sum Interview',
        statement:
          'Given an array of integers, return indices of the two numbers that sum to a target.',
        difficulty: 'easy',
        topics: ['array'],
        companies: ['Google'],
        tags: ['interview'],
      },
    });
    await db.prisma.testCase.create({
      data: {
        problemId: problem.id,
        input: '1\n2\n3\n',
        expectedOutput: 'ok\n',
        isSample: false,
        order: 1,
      },
    });
    return problem;
  };

  const createSession = (token: string, body: Record<string, unknown>) =>
    request.post(`${API}/interviews/sessions`).set(auth(token)).send(body);

  const addTurn = (token: string, id: string, body: Record<string, unknown>) =>
    request.post(`${API}/interviews/sessions/${id}/turns`).set(auth(token)).send(body);

  const endSession = (token: string, id: string) =>
    request.post(`${API}/interviews/sessions/${id}/end`).set(auth(token));

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.post(`${API}/interviews/sessions`).send({ type: 'hr' }).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const faculty = await login('faculty');
      await createSession(faculty.token, { type: 'hr' }).expect(403);
    });
  });

  describe('session creation', () => {
    it('creates a text session with the AI opening question as the first turn', async () => {
      const { token } = await createStudent();
      const res = await createSession(token, { type: 'hr' }).expect(201);
      expect(res.body.type).toBe('hr');
      expect(res.body.mode).toBe('text');
      expect(res.body.status).toBe('created');
      expect(res.body.turns).toEqual([
        expect.objectContaining({
          role: 'ai',
          content: expect.stringContaining('Tell me about yourself'),
        }),
      ]);

      const history = await request.get(`${API}/interviews/sessions`).set(auth(token)).expect(200);
      expect(history.body.meta.total).toBe(1);
      expect(history.body.data[0].id).toBe(res.body.id);
    });

    it('rejects voice mode with an explicit 501 MODE_NOT_AVAILABLE', async () => {
      const { token } = await createStudent();
      const res = await createSession(token, { type: 'hr', mode: 'voice' }).expect(501);
      expect(res.body.code).toBe('MODE_NOT_AVAILABLE');
      expect(res.body.message).toContain('not available yet');
      expect(res.body.message).toContain('text');
    });

    it('rejects video mode with the same explicit contract', async () => {
      const { token } = await createStudent();
      const res = await createSession(token, { type: 'system-design', mode: 'video' }).expect(501);
      expect(res.body.code).toBe('MODE_NOT_AVAILABLE');
    });

    it('rejects an unknown interview type with 400', async () => {
      const { token } = await createStudent();
      await createSession(token, { type: 'phone-screen' }).expect(400);
    });

    it('requires a problemId for dsa interviews', async () => {
      const { token } = await createStudent();
      const res = await createSession(token, { type: 'dsa' }).expect(400);
      expect(res.body.code).toBe('PROBLEM_REQUIRED');
    });

    it('404s for an unknown problemId on a dsa interview', async () => {
      const { token } = await createStudent();
      await createSession(token, { type: 'dsa', problemId: 'nope' }).expect(404);
    });
  });

  describe('multi-turn flow', () => {
    it('runs a full hr interview: turns → end → report', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);

      const turn1 = await addTurn(token, created.body.id, {
        answer: 'I studied computer science.',
      }).expect(201);
      expect(turn1.body.status).toBe('in_progress');
      expect(turn1.body.nextQuestion).toContain('dig deeper');
      expect(turn1.body.feedback).toEqual([expect.objectContaining({ skill: 'problem-solving' })]);

      const turn2 = await addTurn(token, created.body.id, {
        answer: 'I would optimize the constraints first.',
      }).expect(201);
      expect(turn2.body.nextQuestion).toContain('?');

      const session = await request
        .get(`${API}/interviews/sessions/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      expect(session.body.status).toBe('in_progress');
      expect(session.body.turns).toHaveLength(5); // 1 ai opening + (answer + ai next) * 2

      const ended = await endSession(token, created.body.id).expect(201);
      expect(ended.body.status).toBe('ended');
      expect(ended.body.reportAvailable).toBe(true);

      const report = await request
        .get(`${API}/interviews/sessions/${created.body.id}/report`)
        .set(auth(token))
        .expect(200);
      expect(report.body.overallScore).toBe(84);
      expect(report.body.summary).toContain('Strong communication');
      expect(report.body.strengths).toContain('Clear structure');
      expect(report.body.topicScores).toEqual({ communication: 88, problemSolving: 80 });
    });

    it('grades dsa code through the real judge pipeline and feeds the verdict back', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const created = await createSession(token, { type: 'dsa', problemId: problem.id }).expect(
        201,
      );
      expect(created.body.turns[0].content).toContain('Two Sum Interview');

      const turn = await addTurn(token, created.body.id, {
        answer: 'My solution uses a hashmap.',
        code: 'print("ok")',
        languageId: 71,
      }).expect(201);

      expect(turn.body.judgeResult).toEqual({
        verdict: 'accepted',
        passedTestCases: 1,
        totalTestCases: 1,
      });
      expect(turn.body.nextQuestion).toContain('time complexity');

      const stored = await request
        .get(`${API}/interviews/sessions/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      const userTurn = stored.body.turns.find((item: { role: string }) => item.role === 'user');
      expect(userTurn.content).toBe('My solution uses a hashmap.');

      const judgeRows = await db.prisma.interviewTurn.findMany({
        where: { sessionId: created.body.id, role: 'user' },
        select: { judgeVerdict: true, passedTestCases: true, totalTestCases: true },
      });
      expect(judgeRows[0]).toEqual({
        judgeVerdict: 'accepted',
        passedTestCases: 1,
        totalTestCases: 1,
      });
    });

    it('rejects code on non-dsa interviews', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);
      const res = await addTurn(token, created.body.id, {
        answer: 'hi',
        code: 'print(1)',
        languageId: 71,
      }).expect(400);
      expect(res.body.code).toBe('CODE_NOT_ALLOWED');
    });

    it('requires a languageId for dsa code submissions', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const created = await createSession(token, { type: 'dsa', problemId: problem.id }).expect(
        201,
      );
      const res = await addTurn(token, created.body.id, { answer: 'hi', code: 'print(1)' }).expect(
        400,
      );
      expect(res.body.code).toBe('LANGUAGE_REQUIRED');
    });

    it('keeps the session retryable when the AI call fails mid-interview', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);

      const failed = await addTurn(token, created.body.id, {
        answer: 'This turn will FORCE_AI_FAILURE.',
      }).expect(502);
      expect(failed.body.code).toBe('AI_GENERATION_FAILED');

      const before = await db.prisma.interviewTurn.count({ where: { sessionId: created.body.id } });
      expect(before).toBe(1); // only the opening question — nothing half-committed

      const recovered = await addTurn(token, created.body.id, { answer: 'A clean answer.' }).expect(
        201,
      );
      expect(recovered.body.nextQuestion).toContain('dig deeper');

      const after = await db.prisma.interviewTurn.count({ where: { sessionId: created.body.id } });
      expect(after).toBe(3); // opening + answer + next question
    });
  });

  describe('state machine', () => {
    it('409s turns after the session is ended', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);
      await endSession(token, created.body.id).expect(201);
      const res = await addTurn(token, created.body.id, { answer: 'too late' }).expect(409);
      expect(res.body.code).toBe('SESSION_ENDED');
    });

    it('409s the report before the session is ended', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);
      await addTurn(token, created.body.id, { answer: 'one answer' }).expect(201);
      const res = await request
        .get(`${API}/interviews/sessions/${created.body.id}/report`)
        .set(auth(token))
        .expect(409);
      expect(res.body.code).toBe('SESSION_NOT_ENDED');
    });

    it('is idempotent when ending an already-ended session', async () => {
      const { token } = await createStudent();
      const created = await createSession(token, { type: 'hr' }).expect(201);
      await endSession(token, created.body.id).expect(201);
      const again = await endSession(token, created.body.id).expect(201);
      expect(again.body.alreadyEnded).toBe(true);
      expect(again.body.reportAvailable).toBe(true);
    });
  });

  describe('ownership', () => {
    it("404s for another student's session", async () => {
      const alice = await createStudent();
      const bob = await createStudent();
      const created = await createSession(alice.token, { type: 'hr' }).expect(201);

      await request
        .get(`${API}/interviews/sessions/${created.body.id}`)
        .set(auth(bob.token))
        .expect(404);
      await addTurn(bob.token, created.body.id, { answer: 'hi' }).expect(404);
      await endSession(bob.token, created.body.id).expect(404);
      await request
        .get(`${API}/interviews/sessions/${created.body.id}/report`)
        .set(auth(bob.token))
        .expect(404);
    });
  });
});
