import supertest from 'supertest';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('College Programming Lab (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;
  let studentToken: string;
  let facultyToken: string;
  let studentId: string;
  let subjectId: string;
  let experimentId: string;
  let submissionId: string;
  let _assignmentId: string;
  let examId: string;
  let _vivaId: string;
  let projectId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);

    const student = await factory.createUser({ role: 'student', email: 'lab-student@test.com' });
    studentId = student.id;
    const faculty = await factory.createUser({ role: 'faculty', email: 'lab-faculty@test.com' });

    const studentLogin = await request
      .post(`${API}/auth/login`)
      .send({ email: student.email, password: TEST_PASSWORD })
      .expect(200);
    studentToken = studentLogin.body.accessToken;

    const facultyLogin = await request
      .post(`${API}/auth/login`)
      .send({ email: faculty.email, password: TEST_PASSWORD })
      .expect(200);
    facultyToken = facultyLogin.body.accessToken;

    await db.prisma.labAttendance.deleteMany();
    await db.prisma.coPoMapping.deleteMany();
    await db.prisma.programOutcome.deleteMany();
    await db.prisma.courseOutcome.deleteMany();
    await db.prisma.miniProject.deleteMany();
    await db.prisma.vivaRecord.deleteMany();
    await db.prisma.practicalExamSession.deleteMany();
    await db.prisma.practicalExam.deleteMany();
    await db.prisma.programmingAssignmentSubmission.deleteMany();
    await db.prisma.programmingAssignment.deleteMany();
    await db.prisma.labSubmission.deleteMany();
    await db.prisma.labExperiment.deleteMany();
    await db.prisma.labSubject.deleteMany();
  });

  afterAll(async () => {
    await db.prisma.labAttendance.deleteMany();
    await db.prisma.coPoMapping.deleteMany();
    await db.prisma.programOutcome.deleteMany();
    await db.prisma.courseOutcome.deleteMany();
    await db.prisma.miniProject.deleteMany();
    await db.prisma.vivaRecord.deleteMany();
    await db.prisma.practicalExamSession.deleteMany();
    await db.prisma.practicalExam.deleteMany();
    await db.prisma.programmingAssignmentSubmission.deleteMany();
    await db.prisma.programmingAssignment.deleteMany();
    await db.prisma.labSubmission.deleteMany();
    await db.prisma.labExperiment.deleteMany();
    await db.prisma.labSubject.deleteMany();
    await testApp.close();
    await db.cleanup();
  });

  // ── Subjects ──

  describe('Subjects', () => {
    it('faculty creates a subject', async () => {
      const res = await request
        .post(`${API}/lab/subjects`)
        .set(auth(facultyToken))
        .send({
          name: 'Data Structures Lab',
          code: 'CS201L',
          department: 'CSE',
          semester: 3,
          credits: 1,
        })
        .expect(201);
      subjectId = res.body.id;
      expect(res.body.name).toBe('Data Structures Lab');
    });

    it('lists subjects', async () => {
      const res = await request.get(`${API}/lab/subjects`).set(auth(studentToken)).expect(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('gets a subject by id', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body.name).toBe('Data Structures Lab');
    });

    it('updates a subject', async () => {
      const res = await request
        .put(`${API}/lab/subjects/${subjectId}`)
        .set(auth(facultyToken))
        .send({ name: 'Advanced Data Structures Lab' })
        .expect(200);
      expect(res.body.name).toBe('Advanced Data Structures Lab');
    });
  });

  // ── Experiments ──

  describe('Experiments', () => {
    it('faculty creates an experiment', async () => {
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/experiments`)
        .set(auth(facultyToken))
        .send({
          weekNumber: 1,
          title: 'Array Operations',
          objective: 'Learn array operations',
          problemStatement: 'Implement basic array operations',
        })
        .expect(201);
      experimentId = res.body.id;
    });

    it('lists experiments', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/experiments`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it('updates an experiment', async () => {
      await request
        .put(`${API}/lab/experiments/${experimentId}`)
        .set(auth(facultyToken))
        .send({ title: 'Advanced Array Operations' })
        .expect(200);
    });
  });

  // ── Submissions ──

  describe('Submissions', () => {
    it('student submits code', async () => {
      const res = await request
        .post(`${API}/lab/experiments/${experimentId}/submit`)
        .set(auth(studentToken))
        .send({ sourceCode: '#include <stdio.h>\nint main() { return 0; }', language: 'c' })
        .expect(201);
      submissionId = res.body.id;
    });

    it('gets submission results', async () => {
      const res = await request
        .get(`${API}/lab/submissions/${submissionId}/results`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body.status).toBeDefined();
    });

    it('faculty evaluates submission', async () => {
      const res = await request
        .post(`${API}/lab/submissions/${submissionId}/evaluate`)
        .set(auth(facultyToken))
        .send({
          compilationScore: 20,
          correctnessScore: 30,
          efficiencyScore: 15,
          codingStandardsScore: 10,
          documentationScore: 5,
          feedback: 'Good work',
        })
        .expect(201);
      expect(res.body.totalScore).toBe(80);
    });
  });

  // ── Assignments ──

  describe('Assignments', () => {
    it('faculty creates an assignment', async () => {
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/assignments`)
        .set(auth(facultyToken))
        .send({
          title: 'Linked List Implementation',
          description: 'Implement a singly linked list',
        })
        .expect(201);
      _assignmentId = res.body.id;
    });

    it('lists assignments', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/assignments`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  // ── Practical Exams ──

  describe('Practical Exams', () => {
    it('faculty creates an exam', async () => {
      const now = new Date();
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/exams`)
        .set(auth(facultyToken))
        .send({
          title: 'Lab Midterm',
          description: 'Midterm practical exam',
          startTime: new Date(now.getTime() - 3600000).toISOString(),
          endTime: new Date(now.getTime() + 3600000).toISOString(),
          durationMinutes: 120,
          questionCount: 3,
        })
        .expect(201);
      examId = res.body.id;
    });

    it('student starts exam session', async () => {
      await request
        .post(`${API}/lab/exams/${examId}/start-session`)
        .set(auth(studentToken))
        .expect(201);
    });

    it('student submits exam', async () => {
      await request.post(`${API}/lab/exams/${examId}/submit`).set(auth(studentToken)).expect(204);
    });
  });

  // ── Viva ──

  describe('Viva', () => {
    it('faculty creates a viva', async () => {
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/vivas`)
        .set(auth(facultyToken))
        .send({
          studentId,
          marksObtained: 8,
          remarks: 'Good understanding',
          questionBank: [
            { question: 'Explain arrays', maxMarks: 5 },
            { question: 'What is recursion?', maxMarks: 5 },
          ],
        })
        .expect(201);
      _vivaId = res.body.id;
    });

    it('lists vivas', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/vivas`)
        .set(auth(facultyToken))
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  // ── Mini Projects ──

  describe('Mini Projects', () => {
    it('student creates a mini project', async () => {
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/projects`)
        .set(auth(studentToken))
        .send({
          title: 'Library Management System',
          repoLink: 'https://github.com/student/library',
        })
        .expect(201);
      projectId = res.body.id;
    });

    it('faculty evaluates mini project', async () => {
      const res = await request
        .put(`${API}/lab/projects/${projectId}`)
        .set(auth(facultyToken))
        .send({ evaluationScore: 85, evaluationFeedback: 'Excellent project' })
        .expect(200);
      expect(res.body.evaluationScore).toBe(85);
    });
  });

  // ── Attendance ──

  describe('Attendance', () => {
    it('student marks attendance', async () => {
      await request
        .post(`${API}/lab/subjects/${subjectId}/attendance`)
        .set(auth(studentToken))
        .send({ type: 'lab' })
        .expect(201);
    });

    it('lists attendance', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/attendance`)
        .set(auth(facultyToken))
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  // ── OBE ──

  describe('OBE', () => {
    let coId: string;
    let poId: string;

    it('creates a course outcome', async () => {
      const res = await request
        .post(`${API}/lab/subjects/${subjectId}/obe/course-outcomes`)
        .set(auth(facultyToken))
        .send({ code: 'CO1', description: 'Understand basic data structures' })
        .expect(201);
      coId = res.body.id;
    });

    it('lists course outcomes', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/obe/course-outcomes`)
        .set(auth(facultyToken))
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it('creates a program outcome', async () => {
      const res = await request
        .post(`${API}/lab/obe/program-outcomes`)
        .set(auth(facultyToken))
        .send({ code: 'PO1', description: 'Engineering knowledge' })
        .expect(201);
      poId = res.body.id;
    });

    it('creates a CO-PO mapping', async () => {
      await request
        .post(`${API}/lab/obe/co-po-mapping`)
        .set(auth(facultyToken))
        .send({ coId, poId, attainmentLevel: 3 })
        .expect(201);
    });

    it('gets attainment report', async () => {
      const res = await request
        .get(`${API}/lab/subjects/${subjectId}/obe/attainment-report`)
        .set(auth(facultyToken))
        .expect(200);
      expect(res.body.mappings).toBeInstanceOf(Array);
    });
  });

  // ── Analytics ──

  describe('Analytics', () => {
    it('gets faculty analytics', async () => {
      await request
        .get(`${API}/lab/faculty/analytics`)
        .query({ subjectId })
        .set(auth(facultyToken))
        .expect(200);
    });

    it('gets student analytics', async () => {
      await request.get(`${API}/lab/student/analytics`).set(auth(studentToken)).expect(200);
    });

    it('gets semester dashboard', async () => {
      const res = await request
        .get(`${API}/lab/semester-dashboard`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body.message).toBe('Semester dashboard data');
    });
  });
});
