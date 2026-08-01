import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory } from './support/factories';
import { TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Users — sessions (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const login = async (email: string) => {
    const res = await request
      .post(`${API}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body;
  };

  it('returns 401 without a token', async () => {
    await request.get(`${API}/users/me/sessions`).expect(401);
  });

  it('lists the current user sessions with the list envelope', async () => {
    const { email } = await factory.createUser();
    const tokens = await login(email);

    const res = await request
      .get(`${API}/users/me/sessions`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].current).toBe(true);
    expect(res.body.data[0].id).toBeTruthy();
  });

  it('marks older sessions as not current', async () => {
    const { email } = await factory.createUser();
    const _first = await login(email);
    const second = await login(email);

    const res = await request
      .get(`${API}/users/me/sessions`)
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(2);
    const current = res.body.data.filter((s: { current: boolean }) => s.current);
    expect(current).toHaveLength(1);
    expect(res.body.data[0].current).toBe(true);
  });

  it('revokes one session (204) and it disappears from the list', async () => {
    const { email } = await factory.createUser();
    const _first = await login(email);
    const second = await login(email);

    const list = await request
      .get(`${API}/users/me/sessions`)
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(200);
    const target = list.body.data.find((s: { current: boolean }) => !s.current);

    await request
      .delete(`${API}/users/me/sessions/${target.id}`)
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(204);

    const after = await request
      .get(`${API}/users/me/sessions`)
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(200);
    expect(after.body.meta.total).toBe(1);
  });

  it('cannot revoke another user session (404)', async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();
    const tokensA = await login(userA.email);
    const tokensB = await login(userB.email);

    const listB = await request
      .get(`${API}/users/me/sessions`)
      .set('Authorization', `Bearer ${tokensB.accessToken}`)
      .expect(200);
    const sessionB = listB.body.data[0].id;

    await request
      .delete(`${API}/users/me/sessions/${sessionB}`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .expect(404);
  });

  it('returns 404 for an unknown session id', async () => {
    const { email } = await factory.createUser();
    const tokens = await login(email);
    await request
      .delete(`${API}/users/me/sessions/nope-nope-nope`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(404);
  });

  it('supports pagination params', async () => {
    const { email } = await factory.createUser();
    await login(email);
    await login(email);
    const tokens = await login(email);

    const res = await request
      .get(`${API}/users/me/sessions?page=1&limit=1`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, totalPages: 3 });
  });
});
