import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { JudgeService } from '../src/judge/judge.service';
import { FakeJudgeService } from './support/fake-judge-service';

const API = '/api/v1';

describe('DSA Platform — organize & track (e2e)', () => {
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
      slug?: string;
      difficulty?: string;
      topics?: string[];
      companies?: string[];
    } = {},
  ) => {
    const problem = await db.prisma.problem.create({
      data: {
        slug: overrides.slug ?? `problem-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Sample Problem',
        statement: 'Solve it.',
        difficulty: overrides.difficulty ?? 'easy',
        topics: overrides.topics ?? ['array'],
        companies: overrides.companies ?? ['Google'],
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

  const seedSheet = async (
    problemIds: string[],
    overrides: { slug?: string; name?: string } = {},
  ) => {
    const sheet = await db.prisma.sheet.create({
      data: {
        slug: overrides.slug ?? `sheet-${Math.random().toString(36).slice(2, 8)}`,
        name: overrides.name ?? 'Curated Sheet',
        isActive: true,
      },
    });
    for (let index = 0; index < problemIds.length; index += 1) {
      await db.prisma.sheetProblem.create({
        data: { sheetId: sheet.id, problemId: problemIds[index], order: index + 1 },
      });
    }
    return sheet;
  };

  const solve = async (token: string, problemId: string) => {
    const submit = await request
      .post(`${API}/dsa/problems/${problemId}/submit`)
      .set(auth(token))
      .send({ languageId: 71, sourceCode: 'print(1)' })
      .expect(201);
    const deadline = Date.now() + 15000;
    for (;;) {
      const res = await request
        .get(`${API}/dsa/submissions/${submit.body.submissionId}`)
        .set(auth(token))
        .expect(200);
      if (res.body.status === 'completed') {
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
      await request.get(`${API}/dsa/playlists`).expect(401);
      await request.get(`${API}/dsa/sheets`).expect(401);
      await request.get(`${API}/dsa/progress/me`).expect(401);
      await request.get(`${API}/dsa/analytics/me`).expect(401);
      await request.get(`${API}/dsa/profile/visibility`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const user = await factory.createUser({ role: 'faculty' });
      const login = await request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      await request
        .get(`${API}/dsa/playlists`)
        .set(auth(login.body.accessToken as string))
        .expect(403);
    });
  });

  describe('playlists', () => {
    it('creates, lists and reads a private playlist', async () => {
      const { token } = await createStudent();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(token))
        .send({ title: 'Graphs deep-dive', description: 'ordered' })
        .expect(201);
      expect(created.body.id).toBeTruthy();
      expect(created.body.isPublic).toBe(false);
      expect(created.body.problemCount).toBe(0);

      const list = await request.get(`${API}/dsa/playlists`).set(auth(token)).expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.meta.total).toBe(1);

      const one = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      expect(one.body.title).toBe('Graphs deep-dive');
      expect(one.body.problems).toEqual([]);
    });

    it('hides private playlists of other users as 404 (no existence leak)', async () => {
      const owner = await createStudent();
      const other = await createStudent();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(owner.token))
        .send({ title: 'Secret list' })
        .expect(201);

      const res = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(other.token))
        .expect(404);
      expect(res.body.code).toBe('PLAYLIST_NOT_FOUND');
    });

    it('lets any student read a shared (public) playlist', async () => {
      const owner = await createStudent();
      const other = await createStudent();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(owner.token))
        .send({ title: 'Community list', isPublic: true })
        .expect(201);

      const res = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(other.token))
        .expect(200);
      expect(res.body.title).toBe('Community list');
    });

    it('restricts update/delete to the owner', async () => {
      const owner = await createStudent();
      const other = await createStudent();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(owner.token))
        .send({ title: 'Mine' })
        .expect(201);

      await request
        .patch(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(other.token))
        .send({ title: 'Hijack' })
        .expect(404);
      await request
        .delete(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(other.token))
        .expect(404);

      const updated = await request
        .patch(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(owner.token))
        .send({ title: 'Renamed', isPublic: true })
        .expect(200);
      expect(updated.body.title).toBe('Renamed');
      expect(updated.body.isPublic).toBe(true);

      await request
        .delete(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(owner.token))
        .expect(200);
      const afterDelete = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(owner.token))
        .expect(404);
      expect(afterDelete.body.code).toBe('PLAYLIST_NOT_FOUND');
    });

    it('adds and removes problems, counting them', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(token))
        .send({ title: 'Prep' })
        .expect(201);

      const added = await request
        .post(`${API}/dsa/playlists/${created.body.id}/problems`)
        .set(auth(token))
        .send({ problemId: problem.id })
        .expect(201);
      expect(added.body.added).toBe(true);

      const one = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      expect(one.body.problems).toHaveLength(1);
      expect(one.body.problems[0].id).toBe(problem.id);

      await request
        .post(`${API}/dsa/playlists/${created.body.id}/problems`)
        .set(auth(token))
        .send({ problemId: problem.id })
        .expect(201);
      const stillOne = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      expect(stillOne.body.problems).toHaveLength(1);

      const removed = await request
        .delete(`${API}/dsa/playlists/${created.body.id}/problems/${problem.id}`)
        .set(auth(token))
        .expect(200);
      expect(removed.body.removed).toBe(true);
      const empty = await request
        .get(`${API}/dsa/playlists/${created.body.id}`)
        .set(auth(token))
        .expect(200);
      expect(empty.body.problems).toHaveLength(0);
    });

    it('rejects adding an unknown problem', async () => {
      const { token } = await createStudent();
      const created = await request
        .post(`${API}/dsa/playlists`)
        .set(auth(token))
        .send({ title: 'Prep' })
        .expect(201);
      const res = await request
        .post(`${API}/dsa/playlists/${created.body.id}/problems`)
        .set(auth(token))
        .send({ problemId: 'nope' })
        .expect(404);
      expect(res.body.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('sheets', () => {
    it('lists curated sheets with zero progress before solving', async () => {
      const { token } = await createStudent();
      const p1 = await seedProblem();
      const p2 = await seedProblem();
      await seedSheet([p1.id, p2.id], { slug: 'blind-75-e2e', name: 'Blind 75' });

      const res = await request.get(`${API}/dsa/sheets`).set(auth(token)).expect(200);
      const sheet = res.body.data.find((s: { slug: string }) => s.slug === 'blind-75-e2e');
      expect(sheet).toBeDefined();
      expect(sheet.totalProblems).toBe(2);
      expect(sheet.solvedProblems).toBe(0);
      expect(sheet.progressPercent).toBe(0);
    });

    it('reflects solved problems in per-sheet progress', async () => {
      const { token } = await createStudent();
      const p1 = await seedProblem({ topics: ['array'] });
      const p2 = await seedProblem({ topics: ['dp'] });
      const sheet = await seedSheet([p1.id, p2.id]);

      const before = await request
        .get(`${API}/dsa/sheets/${sheet.id}`)
        .set(auth(token))
        .expect(200);
      expect(before.body.totalProblems).toBe(2);
      expect(before.body.solvedProblems).toBe(0);
      expect(before.body.problems.every((p: { solved: boolean }) => p.solved === false)).toBe(true);

      await solve(token, p1.id);

      const after = await request.get(`${API}/dsa/sheets/${sheet.id}`).set(auth(token)).expect(200);
      expect(after.body.solvedProblems).toBe(1);
      expect(after.body.progressPercent).toBe(50);
      expect(after.body.problems.find((p: { id: string }) => p.id === p1.id).solved).toBe(true);
      expect(after.body.problems.find((p: { id: string }) => p.id === p2.id).solved).toBe(false);
    });

    it('returns 404 for unknown or inactive sheets', async () => {
      const { token } = await createStudent();
      await request.get(`${API}/dsa/sheets/nope`).set(auth(token)).expect(404);

      const p = await seedProblem();
      const sheet = await seedSheet([p.id]);
      await db.prisma.sheet.update({ where: { id: sheet.id }, data: { isActive: false } });
      await request.get(`${API}/dsa/sheets/${sheet.id}`).set(auth(token)).expect(404);
    });
  });

  describe('progress/me', () => {
    it('reports zeroed live progress then reflects solved problems', async () => {
      const { token } = await createStudent();
      const empty = await request.get(`${API}/dsa/progress/me`).set(auth(token)).expect(200);
      expect(empty.body.totalSolved).toBe(0);
      expect(empty.body.byDifficulty).toEqual({ easy: 0, medium: 0, hard: 0 });
      expect(empty.body.byTopic).toEqual([]);

      const p1 = await seedProblem({
        difficulty: 'easy',
        topics: ['array'],
        companies: ['Google'],
      });
      const p2 = await seedProblem({ difficulty: 'medium', topics: ['dp'], companies: ['Amazon'] });
      await solve(token, p1.id);
      await solve(token, p2.id);

      const res = await request.get(`${API}/dsa/progress/me`).set(auth(token)).expect(200);
      expect(res.body.totalSolved).toBe(2);
      expect(res.body.byDifficulty).toEqual({ easy: 1, medium: 1, hard: 0 });
      expect(res.body.byTopic).toContainEqual({ name: 'array', solved: 1 });
      expect(res.body.byTopic).toContainEqual({ name: 'dp', solved: 1 });
      expect(res.body.byCompany).toContainEqual({ name: 'Google', solved: 1 });
      expect(res.body.daily.at(-1).date).toBeTruthy();
      expect(res.body.monthly.at(-1).month).toBeTruthy();
    });
  });

  describe('analytics/me', () => {
    it('computes accuracy, runtime and exposes the rating placeholder', async () => {
      const { token } = await createStudent();
      const problem = await seedProblem({ topics: ['array'] });

      const empty = await request.get(`${API}/dsa/analytics/me`).set(auth(token)).expect(200);
      expect(empty.body.totalSubmissions).toBe(0);
      expect(empty.body.accuracy).toBeNull();
      expect(empty.body.ratingTrend).toEqual({
        available: false,
        message: expect.stringContaining('5.5c'),
      });

      await solve(token, problem.id);
      await request
        .post(`${API}/dsa/problems/${problem.id}/submit`)
        .set(auth(token))
        .send({ languageId: 71, sourceCode: '// WA\nprint(1)' })
        .expect(201);
      const res = await request.get(`${API}/dsa/analytics/me`).set(auth(token)).expect(200);
      expect(res.body.totalSubmissions).toBe(2);
      expect(res.body.solvedProblems).toBe(1);
      expect(res.body.accuracy).toBe(50);
      expect(res.body.acceptanceRate).toBe(50);
      expect(res.body.averageRuntimeMs).toBe(10);
      expect(res.body.heatmap).toHaveLength(90);
      expect(res.body.weakTopics).toEqual([]);
      expect(res.body.strongTopics).toEqual([]);
      expect(res.body.ratingTrend.available).toBe(false);
    });
  });

  describe('profile/visibility', () => {
    it('returns defaults then persists toggles', async () => {
      const { token } = await createStudent();
      const defaults = await request
        .get(`${API}/dsa/profile/visibility`)
        .set(auth(token))
        .expect(200);
      expect(defaults.body.showEmail).toBe(false);
      expect(defaults.body.showFullName).toBe(true);
      expect(defaults.body.showRating).toBe(true);

      const patched = await request
        .patch(`${API}/dsa/profile/visibility`)
        .set(auth(token))
        .send({ showEmail: true, showRating: false })
        .expect(200);
      expect(patched.body.showEmail).toBe(true);
      expect(patched.body.showRating).toBe(false);
      expect(patched.body.showFullName).toBe(true);
      expect(patched.body.showSolvedCount).toBe(true);

      const after = await request.get(`${API}/dsa/profile/visibility`).set(auth(token)).expect(200);
      expect(after.body.showEmail).toBe(true);
      expect(after.body.showRating).toBe(false);
    });
  });

  describe('discussion', () => {
    it('creates a post for a problem and lists it with author + votes', async () => {
      const { user, token } = await createStudent();
      const problem = await seedProblem();

      const created = await request
        .post(`${API}/dsa/problems/${problem.id}/discussion`)
        .set(auth(token))
        .send({ title: 'Two-pointer intuition', body: 'Think from the outside in.' })
        .expect(201);
      expect(created.body.problemId).toBe(problem.id);

      const list = await request
        .get(`${API}/dsa/problems/${problem.id}/discussion`)
        .set(auth(token))
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].title).toBe('Two-pointer intuition');
      expect(list.body.data[0].author.fullName).toBe(user.fullName);
      expect(list.body.data[0].upvoteCount).toBe(0);
      expect(list.body.data[0].upvoted).toBe(false);
      expect(list.body.meta.total).toBe(1);
    });

    it('returns 404 when creating discussion for an unknown problem', async () => {
      const { token } = await createStudent();
      const res = await request
        .post(`${API}/dsa/problems/nope/discussion`)
        .set(auth(token))
        .send({ title: 't', body: 'b' })
        .expect(404);
      expect(res.body.code).toBe('PROBLEM_NOT_FOUND');
    });

    it('upvotes once per user and stays idempotent', async () => {
      const { token } = await createStudent();
      const other = await createStudent();
      const problem = await seedProblem();
      const post = await request
        .post(`${API}/dsa/problems/${problem.id}/discussion`)
        .set(auth(token))
        .send({ title: 'Worth a vote', body: 'b' })
        .expect(201);

      const first = await request
        .post(`${API}/dsa/discussion/${post.body.id}/upvote`)
        .set(auth(token))
        .expect(201);
      expect(first.body.upvoteCount).toBe(1);
      expect(first.body.upvoted).toBe(true);

      const second = await request
        .post(`${API}/dsa/discussion/${post.body.id}/upvote`)
        .set(auth(token))
        .expect(201);
      expect(second.body.upvoteCount).toBe(1);

      await request
        .post(`${API}/dsa/discussion/${post.body.id}/upvote`)
        .set(auth(other.token))
        .expect(201);
      const after = await request
        .post(`${API}/dsa/discussion/${post.body.id}/upvote`)
        .set(auth(other.token))
        .expect(201);
      expect(after.body.upvoteCount).toBe(2);

      const list = await request
        .get(`${API}/dsa/problems/${problem.id}/discussion`)
        .set(auth(token))
        .expect(200);
      expect(list.body.data[0].upvoted).toBe(true);
    });

    it('returns 404 when upvoting an unknown post', async () => {
      const { token } = await createStudent();
      const res = await request
        .post(`${API}/dsa/discussion/nope/upvote`)
        .set(auth(token))
        .expect(404);
      expect(res.body.code).toBe('DISCUSSION_NOT_FOUND');
    });
  });
});
