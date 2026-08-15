import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Payments & Billing (e2e)', () => {
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

  const createAdmin = async () => {
    const user = await factory.createUser({ role: 'admin' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  describe('plans', () => {
    it('lists plans (empty initially)', async () => {
      const res = await request.get(`${API}/billing/plans`).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('creates a plan as admin', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Pro Monthly', amount: 499, features: ['Feature A', 'Feature B'] })
        .expect(201);
      expect(res.body.name).toBe('Pro Monthly');
      expect(res.body.amount).toBe(499);
      expect(res.body.isActive).toBe(true);
    });

    it('returns 401 for unauthenticated plan creation', async () => {
      await request.post(`${API}/billing/plans`).send({ name: 'Fail', amount: 100 }).expect(401);
    });

    it('returns 403 for student plan creation', async () => {
      const student = await createStudent();
      await request
        .post(`${API}/billing/plans`)
        .set(auth(student.token))
        .send({ name: 'Fail', amount: 100 })
        .expect(403);
    });

    it('updates a plan as admin', async () => {
      const admin = await createAdmin();
      const createRes = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Basic', amount: 199 })
        .expect(201);

      const res = await request
        .patch(`${API}/billing/plans/${createRes.body.id}`)
        .set(auth(admin.token))
        .send({ amount: 299 })
        .expect(200);
      expect(res.body.amount).toBe(299);
    });
  });

  describe('coupons', () => {
    it('creates a coupon as admin', async () => {
      const admin = await createAdmin();
      const res = await request
        .post(`${API}/billing/coupons`)
        .set(auth(admin.token))
        .send({ code: 'WELCOME20', discountType: 'percentage', discountValue: 20 })
        .expect(201);
      expect(res.body.code).toBe('WELCOME20');
    });

    it('returns 409 for duplicate coupon code', async () => {
      const admin = await createAdmin();
      await request
        .post(`${API}/billing/coupons`)
        .set(auth(admin.token))
        .send({ code: 'DUP', discountType: 'percentage', discountValue: 10 })
        .expect(201);

      await request
        .post(`${API}/billing/coupons`)
        .set(auth(admin.token))
        .send({ code: 'DUP', discountType: 'percentage', discountValue: 10 })
        .expect(409);
    });

    it('lists coupons as admin', async () => {
      const admin = await createAdmin();
      const res = await request.get(`${API}/billing/coupons`).set(auth(admin.token)).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('subscriptions', () => {
    it('creates subscription and invoice', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Sub Test', amount: 500 })
        .expect(201);

      const student = await createStudent();
      const res = await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      expect(res.body.subscription.status).toBe('active');
      expect(res.body.invoice).toBeDefined();
    });

    it('returns 409 if already subscribed', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Dup Test', amount: 500 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(409);
    });

    it('applies coupon to subscription', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Coupon Test', amount: 1000 })
        .expect(201);

      await request
        .post(`${API}/billing/coupons`)
        .set(auth(admin.token))
        .send({ code: 'FLAT100', discountType: 'fixed', discountValue: 100 })
        .expect(201);

      const student = await createStudent();
      const res = await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id, couponCode: 'FLAT100' })
        .expect(201);

      expect(res.body.invoice.amount).toBe(900);
    });

    it('cancels subscription', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Cancel Test', amount: 300 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      const res = await request
        .post(`${API}/billing/cancel`)
        .set(auth(student.token))
        .send({ immediate: true })
        .expect(200);

      expect(res.body.status).toBe('cancelled');
    });

    it('returns current subscription', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Me Test', amount: 200 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      const res = await request
        .get(`${API}/billing/subscription/me`)
        .set(auth(student.token))
        .expect(200);

      expect(res.body.status).toBe('active');
    });
  });

  describe('invoices', () => {
    it('lists invoices', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Invoice Test', amount: 400 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      const res = await request.get(`${API}/billing/invoices`).set(auth(student.token)).expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('returns billing history', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'History Test', amount: 350 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/subscribe`)
        .set(auth(student.token))
        .send({ planId: plan.body.id })
        .expect(201);

      const res = await request.get(`${API}/billing/history`).set(auth(student.token)).expect(200);

      expect(res.body.invoices).toBeDefined();
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });
  });

  describe('webhook', () => {
    it('accepts webhook with valid signature', async () => {
      const res = await request
        .post(`${API}/billing/webhooks/razorpay`)
        .send({ event: 'subscription.activated', payload: {} })
        .set('x-razorpay-signature', 'test-sig')
        .expect(200);

      expect(res.body.processed).toBeDefined();
    });

    it('processes webhook idempotently', async () => {
      const payload = { event: 'test.event', payload: { subscription: { id: 'sub_test' } } };

      const res1 = await request
        .post(`${API}/billing/webhooks/razorpay`)
        .send({ ...payload, id: 'evt_dup_1' })
        .set('x-razorpay-signature', 'test-sig')
        .expect(200);

      const res2 = await request
        .post(`${API}/billing/webhooks/razorpay`)
        .send({ ...payload, id: 'evt_dup_1' })
        .set('x-razorpay-signature', 'test-sig')
        .expect(200);

      expect(res1.body.processed).toBe(true);
      expect(res2.body.processed).toBe(false);
    });
  });

  describe('coupon application', () => {
    it('calculates coupon discount without subscribing', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'Calc Test', amount: 1000 })
        .expect(201);

      await request
        .post(`${API}/billing/coupons`)
        .set(auth(admin.token))
        .send({ code: 'CALC20', discountType: 'percentage', discountValue: 20 })
        .expect(201);

      const student = await createStudent();
      const res = await request
        .post(`${API}/billing/coupons/apply`)
        .set(auth(student.token))
        .send({ code: 'CALC20', planId: plan.body.id })
        .expect(201);

      expect(res.body.discountAmount).toBe(200);
      expect(res.body.finalAmount).toBe(800);
    });

    it('returns 404 for unknown coupon', async () => {
      const admin = await createAdmin();
      const plan = await request
        .post(`${API}/billing/plans`)
        .set(auth(admin.token))
        .send({ name: 'No Coupon', amount: 500 })
        .expect(201);

      const student = await createStudent();
      await request
        .post(`${API}/billing/coupons/apply`)
        .set(auth(student.token))
        .send({ code: 'NOPE', planId: plan.body.id })
        .expect(404);
    });
  });
});
