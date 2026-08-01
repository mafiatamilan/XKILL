import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';

const API = '/api/v1';

describe('Health & docs (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  it('GET /health reports database + redis up (public, no auth)', async () => {
    const res = await request.get(`${API}/health`).expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
  });

  it('exposes Swagger docs at /api/docs (public)', async () => {
    await request.get('/api/docs').expect(200);
  });

  it('serves a 404 envelope for unknown routes', async () => {
    const res = await request.get(`${API}/does-not-exist`).expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      path: `${API}/does-not-exist`,
    });
  });
});
