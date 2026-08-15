import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Community (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;
  let studentToken: string;
  let _studentId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);

    const user = await factory.createUser({ role: 'student' });
    _studentId = user.id;
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

  // ── Forum Posts ──

  describe('Forum Posts', () => {
    let postId: string;

    it('creates a forum post', async () => {
      const res = await request
        .post(`${API}/community/forum/posts`)
        .set(auth(studentToken))
        .send({
          title: 'How to prepare for SDE?',
          body: 'I have 3 months...',
          tags: ['interview', 'sde'],
        })
        .expect(201);

      postId = res.body.id;
      expect(res.body.title).toBe('How to prepare for SDE?');
      expect(res.body.tags).toContain('interview');
      expect(res.body.authorName).toBeDefined();
    });

    it('lists forum posts', async () => {
      const res = await request
        .get(`${API}/community/forum/posts`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('gets a forum post by id', async () => {
      const res = await request
        .get(`${API}/community/forum/posts/${postId}`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.id).toBe(postId);
      expect(res.body.viewCount).toBeGreaterThanOrEqual(1);
    });

    it('updates own post', async () => {
      const res = await request
        .put(`${API}/community/forum/posts/${postId}`)
        .set(auth(studentToken))
        .send({ title: 'Updated title' })
        .expect(200);

      expect(res.body.title).toBe('Updated title');
    });

    it('returns 403 when updating another user post', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .put(`${API}/community/forum/posts/${postId}`)
        .set(auth(otherLogin.body.accessToken))
        .send({ title: 'Hacked' })
        .expect(403);
    });

    it('returns 401 without auth', async () => {
      await request
        .post(`${API}/community/forum/posts`)
        .send({ title: 'T', body: 'B' })
        .expect(401);
    });
  });

  // ── Forum Comments ──

  describe('Forum Comments', () => {
    let postId: string;
    let commentId: string;

    beforeAll(async () => {
      const res = await request
        .post(`${API}/community/forum/posts`)
        .set(auth(studentToken))
        .send({ title: 'Comment test post', body: 'Body' })
        .expect(201);
      postId = res.body.id;
    });

    it('creates a comment', async () => {
      const res = await request
        .post(`${API}/community/forum/posts/${postId}/comments`)
        .set(auth(studentToken))
        .send({ body: 'Great question!' })
        .expect(201);

      commentId = res.body.id;
      expect(res.body.body).toBe('Great question!');
      expect(res.body.postId).toBe(postId);
    });

    it('lists comments', async () => {
      const res = await request
        .get(`${API}/community/forum/posts/${postId}/comments`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('updates own comment', async () => {
      const res = await request
        .put(`${API}/community/forum/comments/${commentId}`)
        .set(auth(studentToken))
        .send({ body: 'Updated comment' })
        .expect(200);

      expect(res.body.body).toBe('Updated comment');
    });

    it('returns 403 when updating another user comment', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .put(`${API}/community/forum/comments/${commentId}`)
        .set(auth(otherLogin.body.accessToken))
        .send({ body: 'Hacked' })
        .expect(403);
    });

    it('deletes own comment', async () => {
      const createRes = await request
        .post(`${API}/community/forum/posts/${postId}/comments`)
        .set(auth(studentToken))
        .send({ body: 'To delete' })
        .expect(201);

      await request
        .delete(`${API}/community/forum/comments/${createRes.body.id}`)
        .set(auth(studentToken))
        .expect(204);
    });
  });

  // ── Likes ──

  describe('Likes', () => {
    let postId: string;

    beforeAll(async () => {
      const res = await request
        .post(`${API}/community/forum/posts`)
        .set(auth(studentToken))
        .send({ title: 'Like test post', body: 'Body' })
        .expect(201);
      postId = res.body.id;
    });

    it('likes a post', async () => {
      await request
        .post(`${API}/community/posts/${postId}/like`)
        .set(auth(studentToken))
        .expect(201);
    });

    it('returns 409 on duplicate like', async () => {
      await request
        .post(`${API}/community/posts/${postId}/like`)
        .set(auth(studentToken))
        .expect(409);
    });

    it('unlikes a post', async () => {
      await request
        .delete(`${API}/community/posts/${postId}/like`)
        .set(auth(studentToken))
        .expect(204);
    });

    it('returns 409 when not liked', async () => {
      await request
        .delete(`${API}/community/posts/${postId}/like`)
        .set(auth(studentToken))
        .expect(409);
    });
  });

  // ── Study Groups ──

  describe('Study Groups', () => {
    let groupId: string;

    it('creates a study group', async () => {
      const res = await request
        .post(`${API}/community/study-groups`)
        .set(auth(studentToken))
        .send({ name: 'DSA Study Circle', description: 'Weekly DSA practice', maxMembers: 10 })
        .expect(201);

      groupId = res.body.id;
      expect(res.body.name).toBe('DSA Study Circle');
      expect(res.body.memberCount).toBe(1);
    });

    it('lists study groups', async () => {
      const res = await request
        .get(`${API}/community/study-groups`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('gets a study group by id', async () => {
      const res = await request
        .get(`${API}/community/study-groups/${groupId}`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.id).toBe(groupId);
    });

    it('allows another user to join', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .post(`${API}/community/study-groups/${groupId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(201);
    });

    it('returns 409 when joining twice', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .post(`${API}/community/study-groups/${groupId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(201);

      await request
        .post(`${API}/community/study-groups/${groupId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(409);
    });

    it('allows a member to leave', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .post(`${API}/community/study-groups/${groupId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(201);

      await request
        .post(`${API}/community/study-groups/${groupId}/leave`)
        .set(auth(otherLogin.body.accessToken))
        .expect(204);
    });

    it('prevents creator from leaving', async () => {
      await request
        .post(`${API}/community/study-groups/${groupId}/leave`)
        .set(auth(studentToken))
        .expect(403);
    });
  });

  // ── Coding Clubs ──

  describe('Coding Clubs', () => {
    let clubId: string;

    it('creates a coding club', async () => {
      const res = await request
        .post(`${API}/community/coding-clubs`)
        .set(auth(studentToken))
        .send({ name: 'CP Club', description: 'Weekly contests', maxMembers: 20 })
        .expect(201);

      clubId = res.body.id;
      expect(res.body.name).toBe('CP Club');
      expect(res.body.memberCount).toBe(1);
    });

    it('lists coding clubs', async () => {
      const res = await request
        .get(`${API}/community/coding-clubs`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('gets a coding club by id', async () => {
      const res = await request
        .get(`${API}/community/coding-clubs/${clubId}`)
        .set(auth(studentToken))
        .expect(200);

      expect(res.body.id).toBe(clubId);
    });

    it('allows another user to join', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .post(`${API}/community/coding-clubs/${clubId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(201);
    });

    it('allows a member to leave', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .post(`${API}/community/coding-clubs/${clubId}/join`)
        .set(auth(otherLogin.body.accessToken))
        .expect(201);

      await request
        .post(`${API}/community/coding-clubs/${clubId}/leave`)
        .set(auth(otherLogin.body.accessToken))
        .expect(204);
    });

    it('prevents creator from leaving', async () => {
      await request
        .post(`${API}/community/coding-clubs/${clubId}/leave`)
        .set(auth(studentToken))
        .expect(403);
    });

    it('updates own club', async () => {
      const res = await request
        .put(`${API}/community/coding-clubs/${clubId}`)
        .set(auth(studentToken))
        .send({ name: 'Updated CP Club' })
        .expect(200);

      expect(res.body.name).toBe('Updated CP Club');
    });

    it('returns 403 when updating another user club', async () => {
      const otherUser = await factory.createUser({ role: 'student' });
      const otherLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: otherUser.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .put(`${API}/community/coding-clubs/${clubId}`)
        .set(auth(otherLogin.body.accessToken))
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('deletes own club', async () => {
      const createRes = await request
        .post(`${API}/community/coding-clubs`)
        .set(auth(studentToken))
        .send({ name: 'To Delete Club' })
        .expect(201);

      await request
        .delete(`${API}/community/coding-clubs/${createRes.body.id}`)
        .set(auth(studentToken))
        .expect(204);
    });
  });
});
