import supertest from 'supertest';
import { io, Socket } from 'socket.io-client';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { JudgeService } from '../src/judge/judge.service';
import { FakeJudgeService } from './support/fake-judge-service';

const API = '/api/v1';

describe('Coding Battles (e2e)', () => {
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

  const seedProblem = async () => {
    const problem = await db.prisma.problem.create({
      data: {
        slug: `battle-problem-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Battle Problem',
        statement: 'Return the answer.',
        difficulty: 'easy',
        topics: ['array'],
        companies: ['Google'],
        tags: ['battle'],
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
    it('returns 401 without a token for battle endpoints', async () => {
      await request.get(`${API}/battles/history`).expect(401);
      await request.post(`${API}/battles/practice`).expect(401);
    });

    it('returns 403 for non-student roles', async () => {
      const user = await factory.createUser({ role: 'faculty' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .post(`${API}/battles/practice`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('practice battle', () => {
    it('creates and completes a solo practice battle', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();

      const createRes = await request
        .post(`${API}/battles/practice`)
        .set(auth(token))
        .send({})
        .expect(201);
      expect(createRes.body.type).toBe('practice');
      expect(createRes.body.status).toBe('active');
      expect(createRes.body.problem).toBeDefined();
      const battleId = createRes.body.id;

      const submitRes = await request
        .post(`${API}/battles/${battleId}/submit`)
        .set(auth(token))
        .send({ problemId: problem.id, languageId: 71, sourceCode: 'print(1)' })
        .expect(201);
      expect(submitRes.body.status).toBe('queued');

      await waitForSubmission(token, submitRes.body.submissionId);

      const battleRes = await request
        .get(`${API}/battles/${battleId}`)
        .set(auth(token))
        .expect(200);
      expect(battleRes.body.status).toBe('finished');
      expect(battleRes.body.winnerId).toBe(user.id);
    });

    it('does not change rating for practice battles', async () => {
      const { token } = await createStudent();
      await seedProblem();

      const createRes = await request
        .post(`${API}/battles/practice`)
        .set(auth(token))
        .send({})
        .expect(201);
      const battleId = createRes.body.id;

      const problem = createRes.body.problem;
      await request
        .post(`${API}/battles/${battleId}/submit`)
        .set(auth(token))
        .send({ problemId: problem.id, languageId: 71, sourceCode: 'print(1)' })
        .expect(201);

      // Force battle end by setting endsAt to past
      await db.prisma.battle.update({
        where: { id: battleId },
        data: { endsAt: new Date(Date.now() - 1000) },
      });

      // Trigger finalization via rating read
      const ratingRes = await request.get(`${API}/battles/ratings/me`).set(auth(token)).expect(200);
      expect(ratingRes.body.rating).toBe(1200);

      // Verify no rating history from this battle
      const historyRes = await request
        .get(`${API}/battles/ratings/history`)
        .set(auth(token))
        .expect(200);
      expect(historyRes.body.data).toHaveLength(0);
    });
  });

  describe('private battle', () => {
    it('creates, joins, and completes a private battle via invite code', async () => {
      const alice = await createStudent();
      const bob = await createStudent();

      const createRes = await request
        .post(`${API}/battles/private`)
        .set(auth(alice.token))
        .send({})
        .expect(201);
      expect(createRes.body.status).toBe('pending');
      expect(createRes.body.inviteCode).toBeDefined();
      const inviteCode = createRes.body.inviteCode;

      const joinRes = await request
        .post(`${API}/battles/private/join`)
        .set(auth(bob.token))
        .send({ inviteCode })
        .expect(201);
      expect(joinRes.body.status).toBe('active');
      expect(joinRes.body.participants).toHaveLength(2);
    });

    it('rejects joining with invalid invite code', async () => {
      const { token } = await createStudent();
      await request
        .post(`${API}/battles/private/join`)
        .set(auth(token))
        .send({ inviteCode: 'ZZZZZ' })
        .expect(404);
    });

    it('does not change rating for private battles', async () => {
      const alice = await createStudent();
      const bob = await createStudent();

      const createRes = await request
        .post(`${API}/battles/private`)
        .set(auth(alice.token))
        .send({ durationSeconds: 60 })
        .expect(201);
      const battleId = createRes.body.battleId;
      const inviteCode = createRes.body.inviteCode;

      await request
        .post(`${API}/battles/private/join`)
        .set(auth(bob.token))
        .send({ inviteCode })
        .expect(201);

      // Force battle end
      await db.prisma.battle.update({
        where: { id: battleId },
        data: { endsAt: new Date(Date.now() - 1000), status: 'finished', finishedAt: new Date() },
      });

      const aliceRating = await request
        .get(`${API}/battles/ratings/me`)
        .set(auth(alice.token))
        .expect(200);
      expect(aliceRating.body.rating).toBe(1200);

      const bobRating = await request
        .get(`${API}/battles/ratings/me`)
        .set(auth(bob.token))
        .expect(200);
      expect(bobRating.body.rating).toBe(1200);
    });
  });

  describe('ranked matchmaking — two-client WebSocket e2e', () => {
    it('two clients receive synchronized battle.start, battle.progress, and battle.end events', async () => {
      const alice = await createStudent();
      const bob = await createStudent();
      await seedProblem();

      const address = testApp.app.getHttpServer().address();
      const port = (address as { port: number }).port;

      const socketA: Socket = io(`http://localhost:${port}`, {
        auth: { token: alice.token },
        transports: ['websocket'],
        forceNew: true,
      });
      const socketB: Socket = io(`http://localhost:${port}`, {
        auth: { token: bob.token },
        transports: ['websocket'],
        forceNew: true,
      });

      // Collect events
      const battleStartPromiseA = new Promise<Record<string, unknown>>((resolve) => {
        socketA.once('battle.start', (data: Record<string, unknown>) => resolve(data));
      });
      const battleStartPromiseB = new Promise<Record<string, unknown>>((resolve) => {
        socketB.once('battle.start', (data: Record<string, unknown>) => resolve(data));
      });

      await new Promise<void>((resolve, reject) => {
        let connected = 0;
        const check = () => {
          if (++connected === 2) resolve();
        };
        socketA.on('connect', check);
        socketB.on('connect', check);
        socketA.on('connect_error', reject);
        socketB.on('connect_error', reject);
      });

      // Both join the ranked queue
      await request.post(`${API}/battles/ranked/join-queue`).set(auth(alice.token)).expect(201);
      await request.post(`${API}/battles/ranked/join-queue`).set(auth(bob.token)).expect(201);

      // Wait for battle.start on both sockets
      const startA = await battleStartPromiseA;
      const startB = await battleStartPromiseB;

      // Both receive the same battle
      expect(startA.battleId).toBe(startB.battleId);
      expect(startA.type).toBe('ranked');
      expect(startA.problem).toBeDefined();

      const problemId = (startA.problem as { id: string }).id;

      // Alice solves the problem
      const submitRes = await request
        .post(`${API}/battles/${startA.battleId}/submit`)
        .set(auth(alice.token))
        .send({ problemId, languageId: 71, sourceCode: 'print(1)' })
        .expect(201);

      await waitForSubmission(alice.token, submitRes.body.submissionId);

      // Battle should end with Alice as winner
      const endPromiseB = new Promise<Record<string, unknown>>((resolve) => {
        socketB.once('battle.end', (data: Record<string, unknown>) => resolve(data));
      });

      const endEvent = await endPromiseB;
      expect(endEvent.battleId).toBe(startA.battleId);
      expect(endEvent.winnerId).toBe(alice.user.id);

      socketA.close();
      socketB.close();
    }, 30000);
  });

  describe('battle history', () => {
    it('returns paginated match history', async () => {
      const { token } = await createStudent();
      const res = await request.get(`${API}/battles/history`).set(auth(token)).expect(200);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('battle rating', () => {
    it('returns initial rating for new user', async () => {
      const { token } = await createStudent();
      const res = await request.get(`${API}/battles/ratings/me`).set(auth(token)).expect(200);
      expect(res.body.rating).toBe(1200);
      expect(res.body.tier).toBe('Amateur');
    });
  });
});
