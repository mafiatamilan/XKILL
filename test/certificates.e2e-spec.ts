import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Certificates (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
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

  const seedTemplate = async (name: string) => {
    return db.prisma.certificateTemplate.upsert({
      where: { name },
      create: {
        name,
        category: 'course',
        content: { title: name, subtitle: 'Certificate', body: 'Completed successfully' },
      },
      update: {},
    });
  };

  describe('authorization', () => {
    it('returns 401 without a token for protected endpoints', async () => {
      await request.get(`${API}/certificates/me`).expect(401);
    });

    it('verify endpoint is public (no auth required)', async () => {
      await request.get(`${API}/certificates/verify/nonexistent`).expect(404);
    });
  });

  describe('GET /certificates/me', () => {
    it('returns empty list for student with no certificates', async () => {
      const alice = await createStudent();
      const res = await request.get(`${API}/certificates/me`).set(auth(alice.token)).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('full certificate lifecycle', () => {
    it('issue → verify → QR → renew → LinkedIn share', async () => {
      const alice = await createStudent();
      const template = await seedTemplate('Course Completion');

      // Issue certificate
      const issueRes = await request
        .post(`${API}/certificates`)
        .set(auth(alice.token))
        .send({
          userId: alice.user.id,
          templateId: template.id,
          title: 'Advanced DSA Completion',
          metadata: { courseName: 'DSA Masterclass', hours: 40 },
        })
        .expect(201);

      expect(issueRes.body.certificateNumber).toMatch(/^CERT-/);
      const certId = issueRes.body.id;
      const verificationCode = issueRes.body.verificationCode;

      // List my certificates
      const listRes = await request
        .get(`${API}/certificates/me`)
        .set(auth(alice.token))
        .expect(200);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      // Verify (public)
      const verifyRes = await request
        .get(`${API}/certificates/verify/${verificationCode}`)
        .expect(200);
      expect(verifyRes.body.valid).toBe(true);
      expect(verifyRes.body.certificateNumber).toBe(issueRes.body.certificateNumber);

      // Get QR
      const qrRes = await request
        .get(`${API}/certificates/${certId}/qr`)
        .set(auth(alice.token))
        .expect(200);
      expect(qrRes.body.qrDataUrl).toBeDefined();
      expect(qrRes.body.verificationUrl).toContain('verify/');

      // Renew
      const renewRes = await request
        .post(`${API}/certificates/${certId}/renew`)
        .set(auth(alice.token))
        .expect(201);
      expect(renewRes.body.expiresAt).toBeDefined();

      // LinkedIn share
      const linkedinRes = await request
        .post(`${API}/certificates/${certId}/share/linkedin`)
        .set(auth(alice.token))
        .expect(201);
      expect(linkedinRes.body.shareUrl).toContain('linkedin.com');
    });
  });

  describe('error cases', () => {
    it('returns 404 for verify with invalid code', async () => {
      await request.get(`${API}/certificates/verify/invalid_code`).expect(404);
    });

    it('returns 404 for QR of non-existent certificate', async () => {
      const alice = await createStudent();
      await request.get(`${API}/certificates/nonexistent/qr`).set(auth(alice.token)).expect(404);
    });
  });
});
