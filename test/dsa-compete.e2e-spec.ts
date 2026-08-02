import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { JudgeService } from '../src/judge/judge.service';
import { FakeJudgeService } from './support/fake-judge-service';

const API = '/api/v1';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('DSA Platform — compete (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url, [{ token: JudgeService, useClass: FakeJudgeService }]);
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
  const createFaculty = () => login('faculty');

  const seedProblem = async () => {
    const problem = await db.prisma.problem.create({
      data: {
        slug: `problem-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Sample Problem',
        statement: 'Solve it.',
        difficulty: 'easy',
        topics: ['array'],
        companies: ['Google'],
        tags: ['sample'],
      },
    });
    await db.prisma.testCase.create({
      data: {
        problemId: problem.id,
        input: '1\n',
        expectedOutput: 'ok\n',
        isSample: false,
        order: 1,
      },
    });
    return problem;
  };

  const createContest = async (
    token: string,
    overrides: {
      startTime?: Date;
      endTime?: Date;
      isRated?: boolean;
      problems?: string[];
    } = {},
  ) => {
    const startTime = overrides.startTime ?? new Date(Date.now() - 60_000);
    const endTime = overrides.endTime ?? new Date(Date.now() + 60_000);
    const res = await request
      .post(`${API}/dsa/contests`)
      .set(auth(token))
      .send({
        slug: `weekly-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Weekly Contest',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isRated: overrides.isRated ?? false,
        ...(overrides.problems
          ? { problems: overrides.problems.map((problemId) => ({ problemId })) }
          : {}),
      });
    if (res.status !== 201) {
      throw new Error(`createContest failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const published = await request
      .patch(`${API}/dsa/contests/${res.body.id}`)
      .set(auth(token))
      .send({ status: 'published' })
      .expect(200);
    return published.body;
  };

  const pollSubmission = async (token: string, submissionId: string, deadlineMs = 20_000) => {
    const deadline = Date.now() + deadlineMs;
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
      await wait(100);
    }
  };

  const submitToContest = async (
    token: string,
    problemId: string,
    contestId: string,
    sourceCode: string,
    deadlineMs?: number,
  ) => {
    const submit = await request
      .post(`${API}/dsa/problems/${problemId}/submit`)
      .set(auth(token))
      .send({ languageId: 71, sourceCode, contestId })
      .expect(201);
    return pollSubmission(token, submit.body.submissionId, deadlineMs);
  };

  const getLeaderboard = async (token: string, contestId: string) => {
    const res = await request
      .get(`${API}/dsa/contests/${contestId}/leaderboard`)
      .set(auth(token))
      .expect(200);
    return res.body as {
      contestId: string;
      data: Array<{
        rank: number;
        userId: string;
        fullName: string | null;
        score: number;
        penaltySeconds: number;
      }>;
      total: number;
    };
  };

  describe('authorization', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/dsa/contests`).expect(401);
      await request.get(`${API}/dsa/rating/me`).expect(401);
      await request.get(`${API}/dsa/rating/history`).expect(401);
      await request.post(`${API}/dsa/contests`).expect(401);
    });

    it('blocks students from creating contests (403)', async () => {
      const { token } = await createStudent();
      await request
        .post(`${API}/dsa/contests`)
        .set(auth(token))
        .send({
          slug: 'x',
          title: 'x',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        })
        .expect(403);
    });

    it('blocks faculty from reporting anti-cheat events (student-only)', async () => {
      const { token } = await createFaculty();
      await request
        .post(`${API}/dsa/anti-cheat/event`)
        .set(auth(token))
        .send({ sourceType: 'dsa-contest', sourceId: 'c1', eventType: 'tab-switch' })
        .expect(403);
    });
  });

  describe('contests (CRUD)', () => {
    it('faculty creates a contest, students list/read it, faculty updates and deletes it', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const problem = await seedProblem();

      const created = await request
        .post(`${API}/dsa/contests`)
        .set(auth(faculty.token))
        .send({
          slug: 'weekly-alpha',
          title: 'Weekly Alpha',
          description: 'First week',
          startTime: new Date(Date.now() - 60_000).toISOString(),
          endTime: new Date(Date.now() + 60_000).toISOString(),
          isRated: true,
          problems: [{ problemId: problem.id, basePoints: 150 }],
        })
        .expect(201);
      expect(created.body.slug).toBe('weekly-alpha');
      expect(created.body.problems).toHaveLength(1);
      expect(created.body.problems[0].basePoints).toBe(150);

      const list = await request.get(`${API}/dsa/contests`).set(auth(student.token)).expect(200);
      const found = list.body.data.find((c: { slug: string }) => c.slug === 'weekly-alpha');
      expect(found).toBeDefined();
      expect(found.participantCount).toBe(0);

      const detail = await request
        .get(`${API}/dsa/contests/${created.body.id}`)
        .set(auth(student.token))
        .expect(200);
      expect(detail.body.title).toBe('Weekly Alpha');

      const updated = await request
        .patch(`${API}/dsa/contests/${created.body.id}`)
        .set(auth(faculty.token))
        .send({ title: 'Weekly Alpha R2', status: 'published' })
        .expect(200);
      expect(updated.body.title).toBe('Weekly Alpha R2');

      await request
        .delete(`${API}/dsa/contests/${created.body.id}`)
        .set(auth(faculty.token))
        .expect(200);
      await request
        .get(`${API}/dsa/contests/${created.body.id}`)
        .set(auth(student.token))
        .expect(404);
    });

    it('rejects a duplicate slug with 400', async () => {
      const faculty = await createFaculty();
      const body = {
        slug: 'dupe-contest',
        title: 'Dupe',
        startTime: new Date(Date.now() - 60_000).toISOString(),
        endTime: new Date(Date.now() + 60_000).toISOString(),
      };
      await request.post(`${API}/dsa/contests`).set(auth(faculty.token)).send(body).expect(201);
      const res = await request
        .post(`${API}/dsa/contests`)
        .set(auth(faculty.token))
        .send({ ...body, title: 'Dupe 2' })
        .expect(400);
      expect(res.body.code).toBe('CONTEST_SLUG_TAKEN');
    });

    it('rejects an endTime before startTime', async () => {
      const faculty = await createFaculty();
      const res = await request
        .post(`${API}/dsa/contests`)
        .set(auth(faculty.token))
        .send({
          slug: 'bad-window',
          title: 'Bad',
          startTime: new Date(Date.now() + 60_000).toISOString(),
          endTime: new Date(Date.now() - 60_000).toISOString(),
        })
        .expect(400);
      expect(res.body.code).toBe('INVALID_CONTEST_WINDOW');
    });
  });

  describe('registration', () => {
    it('registers a student once and is idempotent', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const contest = await createContest(faculty.token);

      const first = await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(201);
      expect(first.body).toMatchObject({ registered: true, alreadyRegistered: false });

      const second = await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(201);
      expect(second.body.alreadyRegistered).toBe(true);
    });

    it('rejects registration for a draft contest', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const contest = await createContest(faculty.token);
      await db.prisma.contest.update({ where: { id: contest.id }, data: { status: 'draft' } });

      const res = await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(400);
      expect(res.body.code).toBe('CONTEST_NOT_REGISTERABLE');
    });

    it('returns 404 for an unknown contest', async () => {
      const student = await createStudent();
      await request.post(`${API}/dsa/contests/nope/register`).set(auth(student.token)).expect(404);
    });
  });

  describe('contest submissions (reuse 5.5a pipeline, tagged)', () => {
    it('blocks unregistered users with 403', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const problem = await seedProblem();
      const contest = await createContest(faculty.token, { problems: [problem.id] });

      const res = await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(student.token))
        .send({ languageId: 71, sourceCode: 'print(1)', contestId: contest.id })
        .expect(403);
      expect(res.body.code).toBe('NOT_REGISTERED');
    });

    it('blocks problems that are not part of the contest', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const inProblem = await seedProblem();
      const outProblem = await seedProblem();
      const contest = await createContest(faculty.token, { problems: [inProblem.id] });
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(201);

      const res = await request
        .post(`${API}/dsa/problems/${outProblem.id}/submit`)
        .set(auth(student.token))
        .send({ languageId: 71, sourceCode: 'print(1)', contestId: contest.id })
        .expect(400);
      expect(res.body.code).toBe('PROBLEM_NOT_IN_CONTEST');
    });

    it('blocks submissions after the contest ends', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const problem = await seedProblem();
      const contest = await createContest(faculty.token, {
        startTime: new Date(Date.now() - 120_000),
        endTime: new Date(Date.now() - 60_000),
        problems: [problem.id],
      });
      await db.prisma.contestParticipant.create({
        data: { contestId: contest.id, userId: student.user.id },
      });

      const res = await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(student.token))
        .send({ languageId: 71, sourceCode: 'print(1)', contestId: contest.id })
        .expect(400);
      expect(res.body.code).toBe('CONTEST_ENDED');
    });

    it('accepts a valid in-window contest submission and returns its verdict', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const problem = await seedProblem();
      const contest = await createContest(faculty.token, { problems: [problem.id] });
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(201);

      const submission = await submitToContest(student.token, problem.id, contest.id, 'print(1)');
      expect(submission.verdict).toBe('accepted');
      expect(submission.status).toBe('completed');

      const board = await getLeaderboard(student.token, contest.id);
      expect(board.data[0]).toMatchObject({ userId: student.user.id, score: 100 });
    });
  });

  describe('leaderboard', () => {
    it('ranks live and breaks ties by earlier last-accepted time', async () => {
      const faculty = await createFaculty();
      const alice = await createStudent();
      const bob = await createStudent();
      const problem = await seedProblem();
      const contest = await createContest(faculty.token, { problems: [problem.id] });
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(alice.token))
        .expect(201);
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(bob.token))
        .expect(201);

      await submitToContest(alice.token, problem.id, contest.id, 'print(1)');
      // Bob lands ~1.5s later, so Alice's last-accepted time is earlier.
      await submitToContest(bob.token, problem.id, contest.id, '// SLOW:1500\nprint(1)');

      const board = await getLeaderboard(alice.token, contest.id);
      expect(board.total).toBe(2);
      expect(board.data[0]).toMatchObject({ userId: alice.user.id, score: 100 });
      expect(board.data[1]).toMatchObject({ userId: bob.user.id, score: 100 });
      expect(board.data[0].penaltySeconds).toBeLessThan(board.data[1].penaltySeconds);
    });
  });

  describe('time boundary', () => {
    it('grades a late-landing submission but excludes it from the standings', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();
      const problem = await seedProblem();
      // Contest ends ~1.5s after the student submits; grading takes 4s and
      // therefore "lands" after endTime.
      const contest = await createContest(faculty.token, {
        endTime: new Date(Date.now() + 1500),
        problems: [problem.id],
      });
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(student.token))
        .expect(201);

      const submission = await submitToContest(
        student.token,
        problem.id,
        contest.id,
        '// SLOW:4000\nprint(1)',
      );
      expect(submission.verdict).toBe('accepted');
      expect(submission.status).toBe('completed');

      const board = await getLeaderboard(student.token, contest.id);
      const row = board.data.find((entry) => entry.userId === student.user.id);
      expect(row).toBeDefined();
      expect(row?.score).toBe(0);
      expect(row?.penaltySeconds).toBe(0);

      const solveCount = await db.prisma.contestSolve.count({
        where: { participant: { contestId: contest.id } },
      });
      expect(solveCount).toBe(0);
    });
  });

  describe('rating', () => {
    it('returns default rating for a user with no contest history', async () => {
      const student = await createStudent();
      const res = await request.get(`${API}/dsa/rating/me`).set(auth(student.token)).expect(200);
      expect(res.body).toMatchObject({ rating: 1200, contestsParticipated: 0, tier: 'Amateur' });
      expect(res.body.provisional).toBe(true);
    });

    it('finalizes a finished rated contest and applies Elo to participants', async () => {
      const faculty = await createFaculty();
      const alice = await createStudent();
      const bob = await createStudent();
      const problem = await seedProblem();
      const contest = await createContest(faculty.token, {
        isRated: true,
        endTime: new Date(Date.now() + 30_000),
        problems: [problem.id],
      });
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(alice.token))
        .expect(201);
      await request
        .post(`${API}/dsa/contests/${contest.id}/register`)
        .set(auth(bob.token))
        .expect(201);

      await submitToContest(alice.token, problem.id, contest.id, 'print(1)');
      await submitToContest(bob.token, problem.id, contest.id, '// SLOW:1500\nprint(1)');

      // Contest has now ended — the next read finalizes standings lazily.
      await db.prisma.contest.update({
        where: { id: contest.id },
        data: { endTime: new Date(Date.now() - 1000) },
      });

      const board = await getLeaderboard(alice.token, contest.id);
      expect(board.data[0].userId).toBe(alice.user.id);

      const aliceRating = await request
        .get(`${API}/dsa/rating/me`)
        .set(auth(alice.token))
        .expect(200);
      expect(aliceRating.body).toMatchObject({ rating: 1220, contestsParticipated: 1 });
      const bobRating = await request.get(`${API}/dsa/rating/me`).set(auth(bob.token)).expect(200);
      expect(bobRating.body).toMatchObject({ rating: 1180, contestsParticipated: 1 });

      const history = await request
        .get(`${API}/dsa/rating/history`)
        .set(auth(alice.token))
        .expect(200);
      expect(history.body.data).toHaveLength(1);
      expect(history.body.data[0]).toMatchObject({
        contestId: contest.id,
        contestName: 'Weekly Contest',
        rank: 1,
        ratingBefore: 1200,
        ratingAfter: 1220,
        delta: 20,
      });

      const analytics = await request
        .get(`${API}/dsa/analytics/me`)
        .set(auth(alice.token))
        .expect(200);
      expect(analytics.body.ratingTrend.available).toBe(true);
      expect(analytics.body.ratingTrend.points).toHaveLength(1);
      expect(analytics.body.ratingTrend.points[0]).toMatchObject({
        rank: 1,
        ratingBefore: 1200,
        ratingAfter: 1220,
        change: 20,
      });
    });
  });

  describe('anti-cheat', () => {
    it('logs a client-side event for later review', async () => {
      const student = await createStudent();
      const faculty = await createFaculty();
      const contest = await createContest(faculty.token);

      const res = await request
        .post(`${API}/dsa/anti-cheat/event`)
        .set(auth(student.token))
        .send({
          sourceType: 'dsa-contest',
          sourceId: contest.id,
          eventType: 'tab-switch',
          detail: { count: 3, windowMs: 60000 },
        })
        .expect(201);
      expect(res.body.logged).toBe(true);

      const event = await db.prisma.antiCheatEvent.findFirst({
        where: { sourceId: contest.id, sourceType: 'dsa-contest' },
      });
      expect(event).toBeDefined();
      expect(event?.userId).toBe(student.user.id);
      expect(event?.eventType).toBe('tab-switch');
    });
  });
});
