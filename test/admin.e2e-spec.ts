import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory } from './support/factories';
import { TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Admin — user status & roles (e2e)', () => {
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

  const login = async (email: string, password = TEST_PASSWORD) => {
    const res = await request.post(`${API}/auth/login`).send({ email, password }).expect(200);
    return res.body.accessToken as string;
  };

  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const admin = await factory.createUser({ role: 'admin' });
    const student = await factory.createUser();
    adminToken = await login(admin.email);
    studentToken = await login(student.email);
  });

  describe('PATCH /admin/users/:id/suspend|reactivate', () => {
    it('forbids a non-admin (403)', async () => {
      const target = await factory.createUser();
      await request
        .patch(`${API}/admin/users/${target.id}/suspend`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(403);
    });

    it('suspends a user and blocks their login', async () => {
      const target = await factory.createUser();
      const res = await request
        .patch(`${API}/admin/users/${target.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'policy violation' })
        .expect(200);
      expect(res.body.isActive).toBe(false);
      expect(res.body.suspendReason).toBe('policy violation');

      const loginRes = await request
        .post(`${API}/auth/login`)
        .send({ email: target.email, password: TEST_PASSWORD })
        .expect(403);
      expect(loginRes.body.code).toBe('USER_SUSPENDED');
    });

    it('reactivates a user', async () => {
      const target = await factory.createUser({ isActive: false });
      const res = await request
        .patch(`${API}/admin/users/${target.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.isActive).toBe(true);

      await request
        .post(`${API}/auth/login`)
        .send({ email: target.email, password: TEST_PASSWORD })
        .expect(200);
    });

    it('returns 404 for a missing user', async () => {
      await request
        .patch(`${API}/admin/users/does-not-exist/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(404);
    });

    it('returns 409 when already suspended', async () => {
      const target = await factory.createUser({ isActive: false });
      await request
        .patch(`${API}/admin/users/${target.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(409);
    });

    it('audits the suspend action', async () => {
      const target = await factory.createUser();
      await request
        .patch(`${API}/admin/users/${target.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);
      const log = await db.prisma.auditLog.findFirst({
        where: { entityType: 'user', entityId: target.id, action: 'admin.user.suspend' },
      });
      expect(log).not.toBeNull();
    });
  });

  describe('GET /admin/roles', () => {
    it('lists roles with permissions and the list envelope', async () => {
      const res = await request
        .get(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(8);
      const admin = res.body.data.find((r: { name: string }) => r.name === 'admin');
      expect(admin.permissions).toContain('manage:all');
      const student = res.body.data.find((r: { name: string }) => r.name === 'student');
      expect(student.permissions).toEqual(
        expect.arrayContaining(['read:self', 'read:sessions', 'delete:sessions']),
      );
    });

    it('supports search across name and description', async () => {
      const res = await request
        .get(`${API}/admin/roles?search=student`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const names = res.body.data.map((r: { name: string }) => r.name);
      expect(names).toContain('student');
      expect(names.length).toBeLessThan(8);
    });

    it('forbids non-admins (403)', async () => {
      await request
        .get(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('POST /admin/roles', () => {
    it('creates a role with permissions (201)', async () => {
      const res = await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `role_${faker.string.alphanumeric(6)}`,
          description: 'A test role',
          permissions: ['read:self'],
        })
        .expect(201);
      expect(res.body.permissions).toEqual(['read:self']);
    });

    it('rejects duplicate role names (409)', async () => {
      await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'custom_dupe', permissions: [] })
        .expect(201);
      await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'custom_dupe', permissions: [] })
        .expect(409);
    });

    it('rejects unknown permissions (400)', async () => {
      const res = await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `role_${faker.string.alphanumeric(6)}`, permissions: ['fly:to-the-moon'] })
        .expect(400);
      expect(res.body.code).toBe('UNKNOWN_PERMISSIONS');
    });

    it('rejects an invalid payload (400)', async () => {
      await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: 'not-an-array' })
        .expect(400);
    });

    it('audits role creation', async () => {
      const name = `audit_${faker.string.alphanumeric(6)}`;
      const res = await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, permissions: ['read:self'] })
        .expect(201);
      const log = await db.prisma.auditLog.findFirst({
        where: { entityType: 'role', entityId: res.body.id, action: 'admin.role.create' },
      });
      expect(log).not.toBeNull();
    });
  });

  describe('PATCH /admin/roles/:id', () => {
    it('updates role name and replaces the permission set', async () => {
      const res = await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'role_to_update', permissions: ['read:self'] })
        .expect(201);

      const updated = await request
        .patch(`${API}/admin/roles/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'role_updated', permissions: ['read:self', 'read:sessions'] })
        .expect(200);
      expect(updated.body.name).toBe('role_updated');
      expect(updated.body.permissions).toEqual(['read:self', 'read:sessions']);
    });

    it('returns 404 for a missing role', async () => {
      await request
        .patch(`${API}/admin/roles/does-not-exist`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'x' })
        .expect(404);
    });

    it('rejects renaming to an existing role (409)', async () => {
      const res = await request
        .post(`${API}/admin/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'role_other', permissions: [] })
        .expect(201);
      await request
        .patch(`${API}/admin/roles/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'student' })
        .expect(409);
    });
  });
});
