import supertest from 'supertest';
import { io, Socket } from 'socket.io-client';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { JudgeService } from '../src/judge/judge.service';
import { FakeJudgeService } from './support/fake-judge-service';

const API = '/api/v1';

describe('DSA Platform (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [{ token: JudgeService, useClass: FakeJudgeService }]);
    await testApp.app.listen(0);
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

  const seedProblem = async (
    overrides: {
      difficulty?: string;
      topics?: string[];
      companies?: string[];
      tags?: string[];
    } = {},
  ) => {
    const problem = await db.prisma.problem.create({
      data: {
        slug: `two-sum-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Two Sum',
        statement: 'Return indices of the two numbers that sum to target.',
        difficulty: overrides.difficulty ?? 'easy',
        topics: overrides.topics ?? ['array', 'hash-map'],
        companies: overrides.companies ?? ['Google'],
        tags: overrides.tags ?? ['two-pointers'],
      },
    });
    await db.prisma.testCase.create({
      data: {
        problemId: problem.id,
        input: '2\n7\n11\n15\n9\n',
        expectedOutput: '0 1\n',
        isSample: true,
        order: 1,
      },
    });
    await db.prisma.testCase.create({
      data: {
        problemId: problem.id,
        input: '3\n2\n4\n6\n',
        expectedOutput: '1 2\n',
        isSample: false,
        order: 2,
      },
    });
    return problem;
  };

  const seedEditorial = async (problemId: string) => {
    await db.prisma.editorial.create({
      data: { problemId, content: 'Use a hash map.', complexity: 'O(n)' },
    });
  };

  const seedHints = async (problemId: string) => {
    await db.prisma.hint.create({ data: { problemId, order: 1, content: 'Think hash map' } });
    await db.prisma.hint.create({ data: { problemId, order: 2, content: 'Store value->index' } });
    await db.prisma.hint.create({ data: { problemId, order: 3, content: 'Check complement' } });
  };

  const waitForSubmission = async (
    token: string,
    submissionId: string,
  ): Promise<Record<string, unknown>> => {
    const deadline = Date.now() + 15000;
    for (;;) {
      const res = await request
        .get(`${API}/dsa/submissions/${submissionId}`)
        .set(auth(token))
        .expect(200);
      if (res.body.status === 'completed' || res.body.status === 'failed') {
        return res.body;
      }
      if (Date.now() >= deadline) {
        throw new Error('Timed out waiting for grading');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/dsa/problems`).expect(401);
      await request.get(`${API}/dsa/problems/x/editorial`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const user = await factory.createUser({ role: 'faculty' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .get(`${API}/dsa/problems`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('problem browsing', () => {
    it('lists problems with filters and pagination meta', async () => {
      const { token } = await createStudent();
      await seedProblem({ difficulty: 'easy', topics: ['array'] });
      await seedProblem({ difficulty: 'hard', topics: ['dp'] });

      const all = await request.get(`${API}/dsa/problems`).set(auth(token)).expect(200);
      expect(all.body.data.length).toBeGreaterThanOrEqual(2);
      expect(all.body.meta.total).toBeGreaterThanOrEqual(2);

      const easy = await request
        .get(`${API}/dsa/problems?difficulty=easy`)
        .set(auth(token))
        .expect(200);
      expect(easy.body.data.every((p: { difficulty: string }) => p.difficulty === 'easy')).toBe(
        true,
      );

      const dp = await request.get(`${API}/dsa/problems?topic=dp`).set(auth(token)).expect(200);
      expect(dp.body.data.every((p: { topics: string[] }) => p.topics.includes('dp'))).toBe(true);
    });

    it('returns only sample test cases for a problem detail', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const res = await request
        .get(`${API}/dsa/problems/${problem.id}`)
        .set(auth(token))
        .expect(200);
      expect(res.body.id).toBe(problem.id);
      expect(res.body.samples).toHaveLength(1);
      expect(res.body.samples[0].isSample).toBe(true);
      expect(res.body.testCases).toBeUndefined();
    });

    it('returns 404 for an unknown problem', async () => {
      const { token } = await createStudent();
      const res = await request.get(`${API}/dsa/problems/nope`).set(auth(token)).expect(404);
      expect(res.body.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('run code', () => {
    it('runs code against custom stdin and returns a verdict', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();
      const res = await request
        .post(`${API}/dsa/problems/${problem.id}/run`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: 'print("hi")', stdin: '' })
        .expect(201);
      expect(res.body.verdict).toBe('accepted');
      const audit = await db.prisma.auditLog.findFirst({
        where: { userId: user.id, action: 'dsa.code.ran' },
      });
      expect(audit).not.toBeNull();
    });

    it('reports non-accepted verdicts for a run', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const res = await request
        .post(`${API}/dsa/problems/${problem.id}/run`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: '// WA\nprint("x")', stdin: '' })
        .expect(201);
      expect(res.body.verdict).toBe('wrong_answer');
    });
  });

  describe('submit → grade → verdict', () => {
    it('accepts a correct solution, records solved, and delivers the verdict over WebSocket', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();

      const address = testApp.app.getHttpServer().address();
      const socket: Socket = io(`http://localhost:${(address as { port: number }).port}`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
      });
      const verdictPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
        socket.once('submission.verdict', (payload: Record<string, unknown>) => resolve(payload));
        socket.once('connect_error', reject);
      });
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
      });

      const submit = await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: 'print(1)' })
        .expect(201);
      expect(submit.body.status).toBe('queued');

      const body = await waitForSubmission(token, submit.body.submissionId);
      expect(body.status).toBe('completed');
      expect(body.verdict).toBe('accepted');
      expect(body.passedTestCases).toBe(1);
      expect(body.totalTestCases).toBe(1);

      const wsEvent = await verdictPromise;
      expect(wsEvent.submissionId).toBe(submit.body.submissionId);
      expect(wsEvent.verdict).toBe('accepted');
      socket.close();

      const solved = await db.prisma.solvedProblem.count({
        where: { userId: user.id, problemId: problem.id },
      });
      expect(solved).toBe(1);
    });

    it.each([
      ['// WA', 'wrong_answer'],
      ['// TLE', 'time_limit_exceeded'],
      ['// MLE', 'memory_limit_exceeded'],
      ['// RE', 'runtime_error'],
      ['// CE', 'compilation_error'],
    ])('records the %s verdict without marking solved', async (marker, verdict) => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();
      const submit = await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: `${marker}\nprint(1)` })
        .expect(201);
      const body = await waitForSubmission(token, submit.body.submissionId);
      expect(body.status).toBe('completed');
      expect(body.verdict).toBe(verdict);
      const solved = await db.prisma.solvedProblem.count({
        where: { userId: user.id, problemId: problem.id },
      });
      expect(solved).toBe(0);
    });

    it('handles concurrent double-submission with a single solved row', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();
      const [a, b] = await Promise.all([
        request
          .post(`${API}/dsa/problems/${problem.id}/submit`)
          .set(auth(token))
          .send({ languageId: 71, sourceCode: 'print(1)' }),
        request
          .post(`${API}/dsa/problems/${problem.id}/submit`)
          .set(auth(token))
          .send({ languageId: 71, sourceCode: 'print(1)' }),
      ]);
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      await Promise.all([
        waitForSubmission(token, a.body.submissionId),
        waitForSubmission(token, b.body.submissionId),
      ]);
      const solved = await db.prisma.solvedProblem.count({
        where: { userId: user.id, problemId: problem.id },
      });
      expect(solved).toBe(1);
    });
  });

  describe('editorial', () => {
    it('returns the editorial content', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      await seedEditorial(problem.id);
      const res = await request
        .get(`${API}/dsa/problems/${problem.id}/editorial`)
        .set(auth(token))
        .expect(200);
      expect(res.body.content).toBe('Use a hash map.');
      expect(res.body.complexity).toBe('O(n)');
    });

    it('returns 404 when no editorial exists', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const res = await request
        .get(`${API}/dsa/problems/${problem.id}/editorial`)
        .set(auth(token))
        .expect(404);
      expect(res.body.code).toBe('EDITORIAL_NOT_FOUND');
    });
  });

  describe('hints', () => {
    it('reveals hints progressively and enforces sequential unlock', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();
      await seedHints(problem.id);

      const first = await request
        .get(`${API}/dsa/problems/${problem.id}/hints`)
        .set(auth(token))
        .expect(200);
      expect(first.body.hints[0].isUnlocked).toBe(true);
      expect(first.body.hints[0].content).toBe('Think hash map');
      expect(first.body.hints[1].isUnlocked).toBe(false);
      expect(first.body.hints[1].content).toBeNull();

      const skip = await request
        .post(`${API}/dsa/problems/${problem.id}/hints/unlock`)
        .set(auth(token))
        .send({ hintOrder: 3 })
        .expect(404);
      expect(skip.body.code).toBe('HINT_LOCKED');

      const unlock2 = await request
        .post(`${API}/dsa/problems/${problem.id}/hints/unlock`)
        .set(auth(token))
        .send({ hintOrder: 2 })
        .expect(201);
      expect(unlock2.body.order).toBe(2);
      expect(unlock2.body.content).toBe('Store value->index');

      const after = await request
        .get(`${API}/dsa/problems/${problem.id}/hints`)
        .set(auth(token))
        .expect(200);
      expect(after.body.hints[1].isUnlocked).toBe(true);
      expect(after.body.hints[1].content).toBe('Store value->index');
      expect(after.body.hints[2].isUnlocked).toBe(false);

      const audit = await db.prisma.auditLog.count({
        where: { userId: user.id, action: 'dsa.hint.unlocked' },
      });
      expect(audit).toBe(1);
    });
  });

  describe('submission history', () => {
    it('lists only my submissions with pagination and verdict filter', async () => {
      const { token } = await createStudent();
      const other = await createStudent();
      const problem = await seedProblem();

      await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: 'print(1)' })
        .expect(201);
      await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: '// WA\nprint(1)' })
        .expect(201);
      await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(other.token))
        .send({ languageId: 71, sourceCode: 'print(1)' })
        .expect(201);

      const mine = await request.get(`${API}/dsa/submissions/me`).set(auth(token)).expect(200);
      expect(mine.body.data).toHaveLength(2);
      expect(mine.body.data.every((s: { problemId: string }) => s.problemId === problem.id)).toBe(
        true,
      );

      const accepted = await request
        .get(`${API}/dsa/submissions/me?verdict=accepted`)
        .set(auth(token))
        .expect(200);
      expect(accepted.body.data).toHaveLength(1);
      expect(accepted.body.data[0].verdict).toBe('accepted');

      const otherOwn = await request
        .get(`${API}/dsa/submissions/${mine.body.data[0].id}`)
        .set(auth(other.token))
        .expect(404);
      expect(otherOwn.body.code).toBe('SUBMISSION_NOT_FOUND');
    });
  });
});
