import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('System Administration (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;
  let adminToken: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);

    const admin = await factory.createUser({ role: 'admin' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: admin.email, password: TEST_PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  // ── Feature Flags ──

  describe('Feature Flags', () => {
    let flagKey: string;

    it('creates a feature flag', async () => {
      flagKey = `flag-${Date.now()}`;
      const res = await request
        .post(`${API}/admin/feature-flags`)
        .set(auth(adminToken))
        .send({ key: flagKey, name: 'New Dashboard', isEnabled: false, rolloutPct: 50 })
        .expect(201);

      expect(res.body.key).toBe(flagKey);
      expect(res.body.isEnabled).toBe(false);
      expect(res.body.rolloutPct).toBe(50);
    });

    it('lists feature flags', async () => {
      const res = await request.get(`${API}/admin/feature-flags`).set(auth(adminToken)).expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('updates a feature flag', async () => {
      const res = await request
        .patch(`${API}/admin/feature-flags/${flagKey}`)
        .set(auth(adminToken))
        .send({ isEnabled: true, rolloutPct: 100 })
        .expect(200);

      expect(res.body.isEnabled).toBe(true);
      expect(res.body.rolloutPct).toBe(100);
    });

    it('returns 404 for unknown flag', async () => {
      await request
        .patch(`${API}/admin/feature-flags/nonexistent`)
        .set(auth(adminToken))
        .send({ isEnabled: true })
        .expect(404);
    });

    it('returns 409 for duplicate key', async () => {
      await request
        .post(`${API}/admin/feature-flags`)
        .set(auth(adminToken))
        .send({ key: flagKey, name: 'Duplicate' })
        .expect(409);
    });

    it('returns 403 for non-admin', async () => {
      const student = await factory.createUser({ role: 'student' });
      const studentLogin = await request
        .post(`${API}/auth/login`)
        .send({ email: student.email, password: TEST_PASSWORD })
        .expect(200);

      await request
        .get(`${API}/admin/feature-flags`)
        .set(auth(studentLogin.body.accessToken))
        .expect(403);
    });
  });

  // ── Maintenance Mode ──

  describe('Maintenance Mode', () => {
    it('gets maintenance mode status', async () => {
      const res = await request
        .get(`${API}/admin/maintenance-mode`)
        .set(auth(adminToken))
        .expect(200);

      expect(typeof res.body.enabled).toBe('boolean');
    });

    it('toggles maintenance mode', async () => {
      const before = await request
        .get(`${API}/admin/maintenance-mode`)
        .set(auth(adminToken))
        .expect(200);

      const res = await request
        .post(`${API}/admin/maintenance-mode/toggle`)
        .set(auth(adminToken))
        .expect(201);

      expect(res.body.enabled).toBe(!before.body.enabled);

      // Toggle back
      await request.post(`${API}/admin/maintenance-mode/toggle`).set(auth(adminToken)).expect(201);
    });
  });

  // ── Backups ──

  describe('Backups', () => {
    it('lists backups (empty initially)', async () => {
      const res = await request.get(`${API}/admin/backups`).set(auth(adminToken)).expect(200);

      expect(res.body).toBeInstanceOf(Array);
    });

    it('triggers a backup', async () => {
      const res = await request
        .post(`${API}/admin/backups/trigger`)
        .set(auth(adminToken))
        .expect(201);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].filename).toBeDefined();
    });
  });

  // ── Audit Logs ──

  describe('Audit Logs', () => {
    it('lists audit logs', async () => {
      const res = await request.get(`${API}/admin/audit-logs`).set(auth(adminToken)).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
    });

    it('filters by action', async () => {
      const res = await request
        .get(`${API}/admin/audit-logs?action=admin`)
        .set(auth(adminToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ── API Usage ──

  describe('API Usage', () => {
    it('gets API usage stats', async () => {
      const res = await request.get(`${API}/admin/api-usage`).set(auth(adminToken)).expect(200);

      expect(typeof res.body.totalRequests).toBe('number');
      expect(res.body.byEndpoint).toBeInstanceOf(Array);
      expect(res.body.byStatus).toBeInstanceOf(Array);
    });
  });

  // ── Error Monitoring ──

  describe('Error Monitoring', () => {
    it('gets error stats', async () => {
      const res = await request
        .get(`${API}/admin/error-monitoring`)
        .set(auth(adminToken))
        .expect(200);

      expect(typeof res.body.totalErrors).toBe('number');
      expect(res.body.byEndpoint).toBeInstanceOf(Array);
      expect(res.body.byStatus).toBeInstanceOf(Array);
    });
  });

  // ── Health ──

  describe('Health', () => {
    it('returns system health', async () => {
      const res = await request.get(`${API}/admin/health`).set(auth(adminToken)).expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.memoryUsage).toBeDefined();
    });
  });
});
