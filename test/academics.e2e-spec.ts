import supertest from 'supertest';
import { faker } from '@faker-js/faker';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';

const API = '/api/v1';

describe('College Academics Module (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  let studentToken: string;
  let facultyToken: string;
  let otherFacultyToken: string;
  let adminToken: string;

  let departmentId: string;
  let semesterId: string;
  let subjectId: string;
  let otherSubjectId: string;
  let studentId: string;
  let facultyId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    db = await createTestDatabase();
    testApp = await createTestApp(db.url);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);

    const dept = await db.prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE' },
    });
    departmentId = dept.id;
    const sem = await db.prisma.semester.create({ data: { number: 1, name: 'Semester I' } });
    semesterId = sem.id;

    const student = await factory.createUser({ role: 'student' });
    studentId = student.id;
    await db.prisma.studentProfile.create({
      data: { userId: student.id, department: dept.name, currentSemester: 1 },
    });

    const faculty = await factory.createUser({ role: 'faculty', fullName: 'Dr. Alpha' });
    facultyId = faculty.id;
    const otherFaculty = await factory.createUser({ role: 'faculty', fullName: 'Dr. Beta' });
    const admin = await factory.createUser({ role: 'college_admin' });

    subjectId = (
      await db.prisma.subject.create({
        data: {
          code: 'CS101',
          name: 'Programming Fundamentals',
          credit: 4,
          departmentId,
          semesterId,
          facultyId: faculty.id,
        },
      })
    ).id;
    otherSubjectId = (
      await db.prisma.subject.create({
        data: {
          code: 'CS102',
          name: 'Discrete Mathematics',
          credit: 3,
          departmentId,
          semesterId,
          facultyId: otherFaculty.id,
        },
      })
    ).id;

    const login = async (user: { email: string }) =>
      request
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
    adminToken = (await login(admin)).body.accessToken as string;
    facultyToken = (await login(faculty)).body.accessToken as string;
    otherFacultyToken = (await login(otherFaculty)).body.accessToken as string;
    studentToken = (await login(student)).body.accessToken as string;
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  describe('authorization', () => {
    it('returns 401 without a token on every route group', async () => {
      await request.get(`${API}/academics/departments`).expect(401);
      await request.get(`${API}/faculty/subjects`).expect(401);
      await request.get(`${API}/admin/departments`).expect(401);
    });

    it('returns 403 for a role that does not own the route group', async () => {
      await request.get(`${API}/faculty/subjects`).set(auth(studentToken)).expect(403);
      await request.get(`${API}/admin/departments`).set(auth(studentToken)).expect(403);
      await request.get(`${API}/academics/departments`).set(auth(facultyToken)).expect(403);
    });
  });

  describe('student reference data', () => {
    it('lists departments and semesters', async () => {
      const departments = await request
        .get(`${API}/academics/departments`)
        .set(auth(studentToken))
        .expect(200);
      expect(departments.body.some((d: { code: string }) => d.code === 'CSE')).toBe(true);

      const semesters = await request
        .get(`${API}/academics/semesters`)
        .set(auth(studentToken))
        .expect(200);
      expect(semesters.body.some((s: { number: number }) => s.number === 1)).toBe(true);
    });

    it('lists subjects with department/semester filters', async () => {
      const res = await request
        .get(`${API}/academics/subjects?department=${departmentId}&semester=${semesterId}`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const codes = res.body.data.map((s: { code: string }) => s.code);
      expect(codes).toContain('CS101');
    });

    it('returns materials and timetable for a subject', async () => {
      await db.prisma.studyMaterial.create({
        data: { subjectId, title: 'Unit 1 Notes', type: 'note', url: 'https://x.example/1.pdf' },
      });
      await db.prisma.timetableSlot.create({
        data: { subjectId, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'B-101' },
      });

      const materials = await request
        .get(`${API}/academics/subjects/${subjectId}/materials`)
        .set(auth(studentToken))
        .expect(200);
      expect(materials.body.length).toBeGreaterThanOrEqual(1);

      const timetable = await request
        .get(`${API}/academics/subjects/${subjectId}/timetable`)
        .set(auth(studentToken))
        .expect(200);
      expect(timetable.body[0].room).toBe('B-101');
    });

    it('returns 404 for an unknown subject on materials/timetable', async () => {
      await request
        .get(`${API}/academics/subjects/nope/materials`)
        .set(auth(studentToken))
        .expect(404);
      await request
        .get(`${API}/academics/subjects/nope/timetable`)
        .set(auth(studentToken))
        .expect(404);
    });

    it('lists calendar events', async () => {
      await db.prisma.academicCalendarEvent.create({
        data: { title: 'Midterm exams', eventType: 'exam', startAt: new Date('2026-09-01') },
      });
      const res = await request
        .get(`${API}/academics/calendar`)
        .set(auth(studentToken))
        .expect(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('faculty academic management', () => {
    it('lists only the subjects assigned to the faculty member', async () => {
      const res = await request.get(`${API}/faculty/subjects`).set(auth(facultyToken)).expect(200);
      const codes = res.body.data.map((s: { code: string }) => s.code);
      expect(codes).toContain('CS101');
      expect(codes).not.toContain('CS102');
    });

    it('creates a subject assigned to the faculty member', async () => {
      const res = await request
        .post(`${API}/faculty/subjects`)
        .set(auth(facultyToken))
        .send({
          code: 'CS201',
          name: 'Data Structures',
          credit: 4,
          departmentId,
          semesterId,
        })
        .expect(201);
      expect(res.body.faculty.id).toBe(facultyId);
      expect(res.body.code).toBe('CS201');

      const dup = await request
        .post(`${API}/faculty/subjects`)
        .set(auth(facultyToken))
        .send({ code: 'CS201', name: 'Again', departmentId, semesterId })
        .expect(400);
      expect(dup.body.code).toBe('SUBJECT_CODE_EXISTS');
    });

    it('updates an owned subject and forbids another faculty from touching it', async () => {
      await request
        .patch(`${API}/faculty/subjects/${subjectId}`)
        .set(auth(facultyToken))
        .send({ credit: 5 })
        .expect(200);

      await request
        .patch(`${API}/faculty/subjects/${subjectId}`)
        .set(auth(otherFacultyToken))
        .send({ credit: 1 })
        .expect(403);
      await request
        .delete(`${API}/faculty/subjects/${subjectId}`)
        .set(auth(otherFacultyToken))
        .expect(403);
      await request
        .get(`${API}/faculty/subjects/${subjectId}`)
        .set(auth(otherFacultyToken))
        .expect(403);
    });

    it('deletes a subject it owns', async () => {
      const created = await request
        .post(`${API}/faculty/subjects`)
        .set(auth(facultyToken))
        .send({ code: 'CS299', name: 'Temp Subject', departmentId, semesterId })
        .expect(201);
      await request
        .delete(`${API}/faculty/subjects/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(204);
      await request
        .get(`${API}/faculty/subjects/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(404);
    });

    it('manages study materials with faculty ownership checks', async () => {
      const created = await request
        .post(`${API}/faculty/subjects/${subjectId}/materials`)
        .set(auth(facultyToken))
        .send({ title: 'Slides 1', type: 'slide', url: 'https://x.example/s1.pdf' })
        .expect(201);
      expect(created.body.uploadedBy).toBe(facultyId);

      await request
        .patch(`${API}/faculty/materials/${created.body.id}`)
        .set(auth(facultyToken))
        .send({ title: 'Slides 1 v2' })
        .expect(200);

      await request
        .delete(`${API}/faculty/materials/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(204);

      await request
        .patch(`${API}/faculty/materials/${created.body.id}`)
        .set(auth(facultyToken))
        .send({ title: 'gone' })
        .expect(404);
    });

    it('forbids managing materials on another faculty subject', async () => {
      await request
        .post(`${API}/faculty/subjects/${otherSubjectId}/materials`)
        .set(auth(facultyToken))
        .send({ title: 'T', type: 'note', url: 'https://x.example/x.pdf' })
        .expect(403);
      await request
        .get(`${API}/faculty/subjects/${otherSubjectId}/materials`)
        .set(auth(facultyToken))
        .expect(403);
    });

    it('marks attendance transactionally and lists it back', async () => {
      const res = await request
        .post(`${API}/faculty/attendance`)
        .set(auth(facultyToken))
        .send({
          subjectId,
          sessionDate: '2026-08-03',
          records: [{ studentId, status: 'present' }],
        })
        .expect(201);
      expect(res.body.count).toBe(1);

      const list = await request
        .get(`${API}/faculty/attendance?subjectId=${subjectId}&sessionDate=2026-08-03`)
        .set(auth(facultyToken))
        .expect(200);
      expect(list.body[0].status).toBe('present');

      await request
        .post(`${API}/faculty/attendance`)
        .set(auth(facultyToken))
        .send({ subjectId, sessionDate: '2026-08-04', records: [] })
        .expect(400);
    });

    it('forbids marking attendance on another faculty subject', async () => {
      await request
        .post(`${API}/faculty/attendance`)
        .set(auth(facultyToken))
        .send({
          subjectId: otherSubjectId,
          sessionDate: '2026-08-03',
          records: [{ studentId, status: 'present' }],
        })
        .expect(403);
    });

    it('manages assignments on owned subjects', async () => {
      const created = await request
        .post(`${API}/faculty/subjects/${subjectId}/assignments`)
        .set(auth(facultyToken))
        .send({ title: 'Assignment 1', maxScore: 10, dueAt: '2026-09-01' })
        .expect(201);
      expect(created.body.subjectId).toBe(subjectId);

      await request
        .patch(`${API}/faculty/assignments/${created.body.id}`)
        .set(auth(facultyToken))
        .send({ maxScore: 20 })
        .expect(200);

      const list = await request
        .get(`${API}/faculty/subjects/${subjectId}/assignments`)
        .set(auth(facultyToken))
        .expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);

      await request
        .delete(`${API}/faculty/assignments/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(204);
    });

    it('forbids assignment management on another faculty subject', async () => {
      await request
        .post(`${API}/faculty/subjects/${otherSubjectId}/assignments`)
        .set(auth(facultyToken))
        .send({ title: 'X' })
        .expect(403);
    });

    it('manages exams on owned subjects', async () => {
      const created = await request
        .post(`${API}/faculty/subjects/${subjectId}/exams`)
        .set(auth(facultyToken))
        .send({ title: 'Internal Test 1', maxMarks: 50 })
        .expect(201);

      await request
        .patch(`${API}/faculty/exams/${created.body.id}`)
        .set(auth(facultyToken))
        .send({ maxMarks: 60 })
        .expect(200);

      const list = await request
        .get(`${API}/faculty/subjects/${subjectId}/exams`)
        .set(auth(facultyToken))
        .expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);

      await request
        .delete(`${API}/faculty/exams/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(204);
    });

    it('forbids exam management on another faculty subject', async () => {
      await request
        .post(`${API}/faculty/subjects/${otherSubjectId}/exams`)
        .set(auth(facultyToken))
        .send({ title: 'X' })
        .expect(403);
    });

    it('enters bulk marks transactionally and lists the gradebook', async () => {
      const exam = await request
        .post(`${API}/faculty/subjects/${subjectId}/exams`)
        .set(auth(facultyToken))
        .send({ title: 'Bulk Test', maxMarks: 100 })
        .expect(201);
      const examId = exam.body.id as string;

      const res = await request
        .post(`${API}/faculty/exams/${examId}/marks`)
        .set(auth(facultyToken))
        .send({ marks: [{ studentId, marksObtained: 85 }] })
        .expect(201);
      expect(res.body.count).toBe(1);

      const gradebook = await request
        .get(`${API}/faculty/exams/${examId}/marks`)
        .set(auth(facultyToken))
        .expect(200);
      expect(gradebook.body[0]).toMatchObject({ studentId, marksObtained: 85 });

      await request
        .post(`${API}/faculty/exams/${examId}/marks`)
        .set(auth(facultyToken))
        .send({ marks: [{ studentId, marksObtained: 150 }] })
        .expect(400);
    });

    it('rolls back the whole batch when a mark row fails mid-transaction', async () => {
      const exam = await request
        .post(`${API}/faculty/subjects/${subjectId}/exams`)
        .set(auth(facultyToken))
        .send({ title: 'Rollback Test', maxMarks: 100 })
        .expect(201);
      const examId = exam.body.id as string;

      await request
        .post(`${API}/faculty/exams/${examId}/marks`)
        .set(auth(facultyToken))
        .send({ marks: [{ studentId, marksObtained: 80 }] })
        .expect(201);
      const before = await db.prisma.internalMark.count({ where: { examId } });
      expect(before).toBe(1);

      await request
        .post(`${API}/faculty/exams/${examId}/marks`)
        .set(auth(facultyToken))
        .send({
          marks: [
            { studentId, marksObtained: 90 },
            { studentId: 'nonexistent-student', marksObtained: 70 },
          ],
        })
        .expect(400);

      const after = await db.prisma.internalMark.count({ where: { examId } });
      expect(after).toBe(1);
    });

    it('returns student analytics scoped to the faculty subjects', async () => {
      const res = await request
        .get(`${API}/faculty/students/${studentId}/analytics`)
        .set(auth(facultyToken))
        .expect(200);
      expect(res.body.studentId).toBe(studentId);
      expect(typeof res.body.attendancePercentage).toBe('number');
      expect(res.body.marks.length).toBeGreaterThanOrEqual(1);

      const other = await request
        .get(`${API}/faculty/students/${studentId}/analytics`)
        .set(auth(otherFacultyToken))
        .expect(200);
      expect(other.body.marks).toHaveLength(0);
    });

    it('manages question-bank items on owned subjects', async () => {
      const created = await request
        .post(`${API}/faculty/subjects/${subjectId}/question-bank`)
        .set(auth(facultyToken))
        .send({
          question: 'What is a linked list?',
          difficulty: 'easy',
          marks: 2,
          options: ['a', 'b', 'c'],
        })
        .expect(201);

      await request
        .patch(`${API}/faculty/question-bank/${created.body.id}`)
        .set(auth(facultyToken))
        .send({ difficulty: 'medium' })
        .expect(200);

      const list = await request
        .get(`${API}/faculty/subjects/${subjectId}/question-bank`)
        .set(auth(facultyToken))
        .expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);

      await request
        .delete(`${API}/faculty/question-bank/${created.body.id}`)
        .set(auth(facultyToken))
        .expect(204);
    });

    it('forbids question-bank management on another faculty subject', async () => {
      await request
        .post(`${API}/faculty/subjects/${otherSubjectId}/question-bank`)
        .set(auth(facultyToken))
        .send({ question: 'Q?' })
        .expect(403);
    });
  });

  describe('student academics', () => {
    let assignmentId: string;

    beforeAll(async () => {
      const exam = await db.prisma.exam.create({
        data: {
          subjectId,
          title: 'IT1',
          examType: 'internal',
          maxMarks: 100,
          scheduledAt: new Date('2026-08-20'),
        },
      });
      const assignment = await db.prisma.assignment.create({
        data: { subjectId, title: 'Assignment 1', maxScore: 10 },
      });
      assignmentId = assignment.id;
      await db.prisma.internalMark.create({
        data: {
          subjectId,
          examId: exam.id,
          studentId,
          marksObtained: 85,
          maxMarks: 100,
          attempt: 1,
        },
      });
    });

    it('lists exams for the current student', async () => {
      const res = await request
        .get(`${API}/academics/exams/me`)
        .set(auth(studentToken))
        .expect(200);
      const titles = res.body.map((e: { title: string }) => e.title);
      expect(titles).toContain('IT1');
    });

    it('lists assignments and submits one', async () => {
      const list = await request
        .get(`${API}/academics/assignments/me`)
        .set(auth(studentToken))
        .expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);

      const submit = await request
        .post(`${API}/academics/assignments/${assignmentId}/submit`)
        .set(auth(studentToken))
        .send({ content: 'my solution' })
        .expect(201);
      expect(submit.body.status).toBe('submitted');

      const resubmit = await request
        .post(`${API}/academics/assignments/${assignmentId}/submit`)
        .set(auth(studentToken))
        .send({ content: 'v2' })
        .expect(201);
      expect(resubmit.body.id).toBe(submit.body.id);

      await request
        .post(`${API}/academics/assignments/nope/submit`)
        .set(auth(studentToken))
        .send({ content: 'x' })
        .expect(404);
    });

    it('returns attendance summary, marks, GPA and CGPA', async () => {
      const attendance = await request
        .get(`${API}/academics/attendance/me`)
        .set(auth(studentToken))
        .expect(200);
      expect(attendance.body.data.length).toBeGreaterThanOrEqual(1);
      expect(attendance.body.data[0]).toMatchObject({ totalSessions: expect.any(Number) });

      const marks = await request
        .get(`${API}/academics/marks/me`)
        .set(auth(studentToken))
        .expect(200);
      expect(marks.body.length).toBeGreaterThanOrEqual(1);

      const gpa = await request.get(`${API}/academics/gpa/me`).set(auth(studentToken)).expect(200);
      expect(gpa.body.gpa).toBe(9);
      expect(gpa.body.semester).toBe(1);

      const cgpa = await request
        .get(`${API}/academics/cgpa/me`)
        .set(auth(studentToken))
        .expect(200);
      expect(cgpa.body.cgpa).toBe(9);
    });
  });

  describe('college admin', () => {
    it('creates and lists a department', async () => {
      const created = await request
        .post(`${API}/admin/departments`)
        .set(auth(adminToken))
        .send({ name: 'Electrical Engineering', code: 'EE', description: 'EE dept' })
        .expect(201);
      expect(created.body.code).toBe('EE');

      const dup = await request
        .post(`${API}/admin/departments`)
        .set(auth(adminToken))
        .send({ name: 'Electrical Engineering', code: 'EE' })
        .expect(409);
      expect(dup.body.code).toBe('DEPARTMENT_EXISTS');

      const list = await request.get(`${API}/admin/departments`).set(auth(adminToken)).expect(200);
      const codes = list.body.data.map((d: { code: string }) => d.code);
      expect(codes).toContain('EE');
    });

    it('updates and deletes a department', async () => {
      const created = await request
        .post(`${API}/admin/departments`)
        .set(auth(adminToken))
        .send({ name: 'Mechanical Engineering', code: 'ME' })
        .expect(201);

      await request
        .patch(`${API}/admin/departments/${created.body.id}`)
        .set(auth(adminToken))
        .send({ name: 'Mechanical Engineering (Renamed)' })
        .expect(200);

      await request
        .delete(`${API}/admin/departments/${created.body.id}`)
        .set(auth(adminToken))
        .expect(204);
      await request
        .get(`${API}/admin/departments/${created.body.id}`)
        .set(auth(adminToken))
        .expect(404);
    });

    it('creates a semester and rejects duplicates', async () => {
      const created = await request
        .post(`${API}/admin/semesters`)
        .set(auth(adminToken))
        .send({ number: 8, name: 'Semester VIII' })
        .expect(201);
      expect(created.body.number).toBe(8);

      const dup = await request
        .post(`${API}/admin/semesters`)
        .set(auth(adminToken))
        .send({ number: 8, name: 'Dup' })
        .expect(409);
      expect(dup.body.code).toBe('SEMESTER_EXISTS');
    });

    it('manages courses (subjects) including faculty assignment', async () => {
      const created = await request
        .post(`${API}/admin/courses`)
        .set(auth(adminToken))
        .send({
          code: 'CS301',
          name: 'Operating Systems',
          credit: 4,
          departmentId,
          semesterId,
          facultyId,
        })
        .expect(201);
      expect(created.body.faculty.id).toBe(facultyId);

      const dup = await request
        .post(`${API}/admin/courses`)
        .set(auth(adminToken))
        .send({ code: 'CS301', name: 'Again', departmentId, semesterId })
        .expect(409);
      expect(dup.body.code).toBe('COURSE_CODE_EXISTS');

      await request
        .post(`${API}/admin/courses`)
        .set(auth(adminToken))
        .send({ code: 'CS302', name: 'Networks', departmentId, semesterId, facultyId: 'ghost' })
        .expect(400);

      await request
        .patch(`${API}/admin/courses/${created.body.id}`)
        .set(auth(adminToken))
        .send({ credit: 5 })
        .expect(200);

      const list = await request
        .get(`${API}/admin/courses?search=Operating`)
        .set(auth(adminToken))
        .expect(200);
      expect(list.body.data.length).toBeGreaterThanOrEqual(1);

      await request
        .delete(`${API}/admin/courses/${created.body.id}`)
        .set(auth(adminToken))
        .expect(204);
    });

    it('manages faculty and student accounts', async () => {
      const createdFaculty = await request
        .post(`${API}/admin/faculty`)
        .set(auth(adminToken))
        .send({
          email: faker.internet.email().toLowerCase(),
          fullName: 'Dr. Gamma',
          password: TEST_PASSWORD,
        })
        .expect(201);
      expect(createdFaculty.body.role).toBe('faculty');

      await request
        .patch(`${API}/admin/faculty/${createdFaculty.body.id}`)
        .set(auth(adminToken))
        .send({ fullName: 'Dr. Gamma Updated' })
        .expect(200);

      const facultyList = await request
        .get(`${API}/admin/faculty`)
        .set(auth(adminToken))
        .expect(200);
      expect(facultyList.body.meta.total).toBeGreaterThanOrEqual(3);

      const createdStudent = await request
        .post(`${API}/admin/students`)
        .set(auth(adminToken))
        .send({
          email: faker.internet.email().toLowerCase(),
          fullName: 'New Student',
          password: TEST_PASSWORD,
        })
        .expect(201);
      expect(createdStudent.body.role).toBe('student');

      await request
        .patch(`${API}/admin/students/${createdStudent.body.id}`)
        .set(auth(adminToken))
        .send({ isActive: 0 })
        .expect(200);

      const dupStudent = await request
        .post(`${API}/admin/students`)
        .set(auth(adminToken))
        .send({ email: createdStudent.body.email, fullName: 'Dup', password: TEST_PASSWORD })
        .expect(409);
      expect(dupStudent.body.code).toBe('EMAIL_EXISTS');
    });

    it('returns aggregate academic reports', async () => {
      const res = await request
        .get(`${API}/admin/academic-reports`)
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.summary.departments).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.subjects).toBeGreaterThanOrEqual(1);
      const cse = res.body.byDepartment.find(
        (d: { departmentName: string }) => d.departmentName === 'Computer Science',
      );
      expect(cse).toBeDefined();
      expect(cse.subjectCount).toBeGreaterThanOrEqual(1);
    });
  });
});
