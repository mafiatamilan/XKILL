import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('TPO Portal (e2e)', () => {
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

  const createTpo = async () => {
    const user = await factory.createUser({ role: 'tpo' });
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
    it('returns 401 for unauthenticated dashboard access', async () => {
      await request.get(`${API}/tpo/dashboard`).expect(401);
    });

    it('returns 403 when student tries to access TPO dashboard', async () => {
      const student = await createStudent();
      await request.get(`${API}/tpo/dashboard`).set(auth(student.token)).expect(403);
    });
  });

  describe('full lifecycle', () => {
    it('creates drive → adds eligibility → creates offer → placement report', async () => {
      const tpo = await createTpo();

      // Dashboard (empty)
      const dashRes = await request.get(`${API}/tpo/dashboard`).set(auth(tpo.token)).expect(200);
      expect(dashRes.body.totalDrives).toBe(0);

      // Create drive
      const driveRes = await request
        .post(`${API}/tpo/company-drives`)
        .set(auth(tpo.token))
        .send({
          companyName: 'Google',
          title: 'Google Campus Drive 2026',
          roles: ['SDE', 'Data Analyst'],
          location: 'Bangalore',
          packageLakhs: 18.5,
          deadline: '2026-09-30',
          driveDate: '2026-10-15',
        })
        .expect(201);
      const driveId = driveRes.body.id;
      expect(driveRes.body.companyName).toBe('Google');

      // List drives
      const listRes = await request
        .get(`${API}/tpo/company-drives`)
        .set(auth(tpo.token))
        .expect(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get drive details
      const getRes = await request
        .get(`${API}/tpo/company-drives/${driveId}`)
        .set(auth(tpo.token))
        .expect(200);
      expect(getRes.body.title).toBe('Google Campus Drive 2026');

      // Add eligibility criteria
      const eligRes = await request
        .post(`${API}/tpo/company-drives/${driveId}/eligibility`)
        .set(auth(tpo.token))
        .send({ department: 'CS', passingYear: '2026', backlogsAllowed: 1 })
        .expect(201);
      expect(eligRes.body.department).toBe('CS');

      // List eligibility
      const listElig = await request
        .get(`${API}/tpo/company-drives/${driveId}/eligibility`)
        .set(auth(tpo.token))
        .expect(200);
      expect(listElig.body.length).toBe(1);

      // Create a student for offer
      const student = await createStudent();

      // Create offer
      const offerRes = await request
        .post(`${API}/tpo/company-drives/${driveId}/offers`)
        .set(auth(tpo.token))
        .send({ studentId: student.user.id, role: 'SDE', ctcLakhs: 18.5 })
        .expect(201);
      expect(offerRes.body.ctcLakhs).toBe(18.5);

      // Duplicate offer returns 409
      await request
        .post(`${API}/tpo/company-drives/${driveId}/offers`)
        .set(auth(tpo.token))
        .send({ studentId: student.user.id, role: 'SDE', ctcLakhs: 18.5 })
        .expect(409);

      // List offers
      const listOffers = await request
        .get(`${API}/tpo/company-drives/${driveId}/offers`)
        .set(auth(tpo.token))
        .expect(200);
      expect(listOffers.body.length).toBe(1);

      // Update offer status
      const updateOffer = await request
        .put(`${API}/tpo/offers/${offerRes.body.id}`)
        .set(auth(tpo.token))
        .send({ status: 'accepted' })
        .expect(200);
      expect(updateOffer.body.status).toBe('accepted');

      // Schedule interview
      const interviewRes = await request
        .post(`${API}/tpo/company-drives/${driveId}/interviews`)
        .set(auth(tpo.token))
        .send({
          candidateId: student.user.id,
          scheduledAt: '2026-10-10T10:00:00.000Z',
          type: 'onsite',
          panelMembers: ['Prof. Sharma'],
        })
        .expect(201);
      expect(interviewRes.body.type).toBe('onsite');

      // List interviews
      const listInterviews = await request
        .get(`${API}/tpo/company-drives/${driveId}/interviews`)
        .set(auth(tpo.token))
        .expect(200);
      expect(listInterviews.body.length).toBe(1);

      // Create placement report
      const reportRes = await request
        .post(`${API}/tpo/placement-reports`)
        .set(auth(tpo.token))
        .send({
          academicYear: '2025-2026',
          department: 'CS',
          totalStudents: 120,
          eligibleStudents: 100,
          placedStudents: 85,
          offersMade: 90,
          highestPackage: 45,
          averagePackage: 12.5,
        })
        .expect(201);
      expect(reportRes.body.placedStudents).toBe(85);

      // List placement reports
      const listReports = await request
        .get(`${API}/tpo/placement-reports`)
        .set(auth(tpo.token))
        .expect(200);
      expect(listReports.body.length).toBeGreaterThanOrEqual(1);

      // Department stats
      const statsRes = await request
        .get(`${API}/tpo/department-stats`)
        .set(auth(tpo.token))
        .expect(200);
      expect(Array.isArray(statsRes.body)).toBe(true);

      // Dashboard after data
      const dashAfter = await request.get(`${API}/tpo/dashboard`).set(auth(tpo.token)).expect(200);
      expect(dashAfter.body.totalDrives).toBe(1);
      expect(dashAfter.body.totalOffers).toBe(1);
    });
  });
});
