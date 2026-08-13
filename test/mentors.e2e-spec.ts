import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('Mentor Marketplace (e2e)', () => {
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

  const createMentorUser = async () => {
    const user = await factory.createUser({ role: 'faculty' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  const createStudent = async () => {
    const user = await factory.createUser({ role: 'student' });
    const login = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: login.body.accessToken as string };
  };

  describe('authorization', () => {
    it('returns 401 for unauthenticated profile creation', async () => {
      await request.post(`${API}/mentors/profile`).send({ hourlyRate: 500 }).expect(401);
    });
  });

  describe('full mentor lifecycle', () => {
    it('creates profile → adds availability → student books → pays → reviews', async () => {
      // Mentor creates profile
      const mentorUser = await createMentorUser();
      const profileRes = await request
        .post(`${API}/mentors/profile`)
        .set(auth(mentorUser.token))
        .send({
          headline: 'Senior SDE at Google',
          hourlyRate: 500,
          bio: 'Experienced system design mentor',
          expertise: ['system-design', 'backend'],
        })
        .expect(201);

      const mentorId = profileRes.body.id;
      expect(mentorId).toBeDefined();

      // Public search
      const searchRes = await request
        .get(`${API}/mentors/search?expertise=system-design`)
        .expect(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get profile (public)
      const getRes = await request.get(`${API}/mentors/${mentorId}`).expect(200);
      expect(getRes.body.bio).toBe('Experienced system design mentor');

      // Update profile
      const updateRes = await request
        .put(`${API}/mentors/${mentorId}`)
        .set(auth(mentorUser.token))
        .send({ bio: 'Updated bio' })
        .expect(200);
      expect(updateRes.body.bio).toBe('Updated bio');

      // Add availability (Wednesday = 3)
      const availRes = await request
        .post(`${API}/mentors/${mentorId}/availability`)
        .set(auth(mentorUser.token))
        .send({
          dayOfWeek: 3,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(201);
      expect(availRes.body.dayOfWeek).toBe(3);

      // Get availability
      const getAvailRes = await request.get(`${API}/mentors/${mentorId}/availability`).expect(200);
      expect(getAvailRes.body.length).toBe(1);

      // Student books
      const student = await createStudent();
      const bookRes = await request
        .post(`${API}/mentors/${mentorId}/book`)
        .set(auth(student.token))
        .send({
          availabilityId: availRes.body.id,
          scheduledDate: '2026-08-19', // Wednesday
          topic: 'System Design',
        })
        .expect(201);
      const bookingId = bookRes.body.id;
      expect(bookingId).toBeDefined();

      // Student sees booking
      const myBookings = await request
        .get(`${API}/bookings/me`)
        .set(auth(student.token))
        .expect(200);
      expect(myBookings.body.length).toBeGreaterThanOrEqual(1);

      // Student pays
      const payRes = await request
        .post(`${API}/bookings/${bookingId}/pay`)
        .set(auth(student.token))
        .send({ paymentId: 'pay_test_123' })
        .expect(201);
      expect(payRes.body.success).toBe(true);

      // Mentor marks as completed
      await request
        .post(`${API}/bookings/${bookingId}/complete`)
        .set(auth(mentorUser.token))
        .expect(201);

      // Student reviews
      const reviewRes = await request
        .post(`${API}/bookings/${bookingId}/review`)
        .set(auth(student.token))
        .send({ rating: 5, comment: 'Excellent mentor!' })
        .expect(201);
      expect(reviewRes.body.rating).toBe(5);
    });
  });
});
