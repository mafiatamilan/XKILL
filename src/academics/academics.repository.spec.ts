import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicsRepository } from './academics.repository';

describe('AcademicsRepository', () => {
  let repository: AcademicsRepository;
  let prisma: {
    department: Record<string, jest.Mock>;
    semester: Record<string, jest.Mock>;
    subject: Record<string, jest.Mock>;
    studyMaterial: Record<string, jest.Mock>;
    exam: Record<string, jest.Mock>;
    assignment: Record<string, jest.Mock>;
    assignmentSubmission: Record<string, jest.Mock>;
    attendanceRecord: Record<string, jest.Mock>;
    internalMark: Record<string, jest.Mock>;
    academicCalendarEvent: Record<string, jest.Mock>;
    questionBankItem: Record<string, jest.Mock>;
    timetableSlot: Record<string, jest.Mock>;
    studentProfile: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    role: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AcademicsRepository,
        {
          provide: PrismaService,
          useValue: {
            department: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            semester: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            subject: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            studyMaterial: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            exam: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            assignment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            assignmentSubmission: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
            attendanceRecord: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              upsert: jest.fn(),
              count: jest.fn(),
            },
            internalMark: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            academicCalendarEvent: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            questionBankItem: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            timetableSlot: { findMany: jest.fn() },
            studentProfile: { findUnique: jest.fn() },
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            role: { findUnique: jest.fn() },
            $transaction: jest.fn(),
          } as never,
        },
      ],
    }).compile();

    repository = module.get(AcademicsRepository);
    prisma = module.get(PrismaService) as never;
  });

  describe('departments & semesters', () => {
    it('lists departments ordered by name', async () => {
      prisma.department.findMany.mockResolvedValue([{ id: 'd1' }]);
      await repository.listDepartments();
      expect(prisma.department.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    });

    it('finds a department by id', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'd1' });
      await repository.findDepartmentById('d1');
      expect(prisma.department.findUnique).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('finds a department by name or code', async () => {
      prisma.department.findFirst.mockResolvedValue({ id: 'd1' });
      await repository.findDepartmentByNameOrCode('CSE', 'CSE');
      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ name: 'CSE' }, { code: 'CSE' }] },
      });
    });

    it('creates a department with default null description', async () => {
      prisma.department.create.mockResolvedValue({ id: 'd1' });
      await repository.createDepartment({ name: 'CSE', code: 'CSE' });
      expect(prisma.department.create).toHaveBeenCalledWith({
        data: { name: 'CSE', code: 'CSE', description: null },
      });
    });

    it('updates and deletes a department', async () => {
      prisma.department.update.mockResolvedValue({ id: 'd1' });
      await repository.updateDepartment('d1', { name: 'X' });
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { name: 'X' },
      });
      prisma.department.delete.mockResolvedValue({});
      await repository.deleteDepartment('d1');
      expect(prisma.department.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('lists semesters by number', async () => {
      prisma.semester.findMany.mockResolvedValue([]);
      await repository.listSemesters();
      expect(prisma.semester.findMany).toHaveBeenCalledWith({ orderBy: { number: 'asc' } });
    });

    it('finds a semester by id', async () => {
      prisma.semester.findUnique.mockResolvedValue({ id: 's3' });
      await repository.findSemesterById('s3');
      expect(prisma.semester.findUnique).toHaveBeenCalledWith({ where: { id: 's3' } });
    });

    it('creates a semester', async () => {
      prisma.semester.create.mockResolvedValue({ id: 's3' });
      await repository.createSemester({ number: 3, name: 'Sem III', scheme: '2023' });
      expect(prisma.semester.create).toHaveBeenCalledWith({
        data: { number: 3, name: 'Sem III', scheme: '2023' },
      });
    });
  });

  describe('subjects', () => {
    it('finds a subject by id with relations', async () => {
      prisma.subject.findUnique.mockResolvedValue({ id: 's1' });
      await repository.findSubjectById('s1');
      expect(prisma.subject.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' } }),
      );
    });

    it('finds a subject by unique code', async () => {
      prisma.subject.findUnique.mockResolvedValue({ id: 's1' });
      await repository.findSubjectByCode('CS301');
      expect(prisma.subject.findUnique).toHaveBeenCalledWith({ where: { code: 'CS301' } });
    });

    it('updates a subject', async () => {
      prisma.subject.update.mockResolvedValue({ id: 's1' });
      await repository.updateSubject('s1', { name: 'X', credit: 3 });
      expect(prisma.subject.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { name: 'X', credit: 3 },
      });
    });

    it('deletes a subject', async () => {
      prisma.subject.delete.mockResolvedValue({ id: 's1' });
      await repository.deleteSubject('s1');
      expect(prisma.subject.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('lists subjects with filters and relations', async () => {
      prisma.subject.findMany.mockResolvedValue([]);
      await repository.listSubjects({ departmentId: 'd1', semesterId: 's3', search: 'alg' });
      expect(prisma.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            departmentId: 'd1',
            semesterId: 's3',
            OR: expect.any(Array),
          },
          include: expect.any(Object),
        }),
      );
    });

    it('counts subjects with filters', async () => {
      prisma.subject.count.mockResolvedValue(2);
      expect(await repository.countSubjects({})).toBe(2);
      await repository.countSubjects({ departmentId: 'd1' });
      expect(prisma.subject.count).toHaveBeenCalledWith({ where: { departmentId: 'd1' } });
    });

    it('finds a subject by faculty and id', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
      await repository.findSubjectByFacultyAndId('s1', 'f1');
      expect(prisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', facultyId: 'f1' },
      });
    });

    it('creates a subject with defaults', async () => {
      prisma.subject.create.mockResolvedValue({ id: 's1' });
      await repository.createSubject({
        code: 'CS301',
        name: 'DSA',
        departmentId: 'd1',
        semesterId: 's3',
      });
      expect(prisma.subject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ credit: 4, facultyId: null }),
      });
    });
  });

  describe('materials & timetable', () => {
    it('creates a material', async () => {
      prisma.studyMaterial.create.mockResolvedValue({ id: 'm1' });
      await repository.createMaterial({ subjectId: 's1', title: 'T', type: 'note', url: 'u' });
      expect(prisma.studyMaterial.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'T' }) }),
      );
    });

    it('lists materials for a subject', async () => {
      prisma.studyMaterial.findMany.mockResolvedValue([{ id: 'm1' }]);
      await repository.listMaterials('s1');
      expect(prisma.studyMaterial.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('finds and updates a material', async () => {
      prisma.studyMaterial.findUnique.mockResolvedValue({ id: 'm1' });
      await repository.findMaterialById('m1');
      expect(prisma.studyMaterial.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });

      prisma.studyMaterial.update.mockResolvedValue({ id: 'm1' });
      await repository.updateMaterial('m1', { title: 'T2' });
      expect(prisma.studyMaterial.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { title: 'T2' },
      });
    });

    it('deletes a material', async () => {
      prisma.studyMaterial.delete.mockResolvedValue({});
      await repository.deleteMaterial('m1');
      expect(prisma.studyMaterial.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('lists timetable slots ordered by day then start time', async () => {
      prisma.timetableSlot.findMany.mockResolvedValue([{ id: 't1' }]);
      await repository.listTimetable('s1');
      expect(prisma.timetableSlot.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  });

  describe('exams & assignments', () => {
    it('lists exams for a subject', async () => {
      prisma.exam.findMany.mockResolvedValue([]);
      await repository.listExamsForSubject('s1');
      expect(prisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId: 's1' } }),
      );
    });

    it('lists exams across multiple subjects', async () => {
      prisma.exam.findMany.mockResolvedValue([]);
      await repository.listExams(['s1', 's2']);
      expect(prisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId: { in: ['s1', 's2'] } } }),
      );
    });

    it('finds an exam by id with subject', async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 'e1' });
      await repository.findExamById('e1');
      expect(prisma.exam.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'e1' } }),
      );
    });

    it('creates an exam with defaults', async () => {
      prisma.exam.create.mockResolvedValue({ id: 'e1' });
      await repository.createExam({ subjectId: 's1', title: 'IT1' });
      expect(prisma.exam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ examType: 'internal', maxMarks: 100, scheduledAt: null }),
        }),
      );
    });

    it('updates and deletes an exam', async () => {
      prisma.exam.update.mockResolvedValue({ id: 'e1' });
      await repository.updateExam('e1', { title: 'IT2' });
      expect(prisma.exam.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { title: 'IT2' },
      });

      prisma.exam.delete.mockResolvedValue({});
      await repository.deleteExam('e1');
      expect(prisma.exam.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('lists assignments for a set of subjects and a single subject', async () => {
      prisma.assignment.findMany.mockResolvedValue([]);
      await repository.listAssignments(['s1']);
      expect(prisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId: { in: ['s1'] } } }),
      );
      await repository.listAssignmentsForSubject('s1');
      expect(prisma.assignment.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { subjectId: 's1' } }),
      );
    });

    it('creates an assignment with defaults', async () => {
      prisma.assignment.create.mockResolvedValue({ id: 'a1' });
      await repository.createAssignment({ subjectId: 's1', title: 'A1' });
      expect(prisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ maxScore: null, dueAt: null }) }),
      );
    });

    it('finds, updates and deletes an assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
      await repository.findAssignmentById('a1');
      expect(prisma.assignment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' } }),
      );

      prisma.assignment.update.mockResolvedValue({ id: 'a1' });
      await repository.updateAssignment('a1', { title: 'A2' });
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { title: 'A2' },
      });

      prisma.assignment.delete.mockResolvedValue({});
      await repository.deleteAssignment('a1');
      expect(prisma.assignment.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('finds and lists submissions', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue({ id: 'sub1' });
      await repository.findSubmission('a1', 'u1');
      expect(prisma.assignmentSubmission.findUnique).toHaveBeenCalledWith({
        where: { assignmentId_studentId: { assignmentId: 'a1', studentId: 'u1' } },
      });

      prisma.assignmentSubmission.findMany.mockResolvedValue([]);
      await repository.listSubmissionsForAssignments(['a1'], 'u1');
      expect(prisma.assignmentSubmission.findMany).toHaveBeenCalledWith({
        where: { assignmentId: { in: ['a1'] }, studentId: 'u1' },
      });
    });

    it('upserts a submission', async () => {
      prisma.assignmentSubmission.upsert.mockResolvedValue({ id: 'sub1' });
      await repository.upsertSubmission({ assignmentId: 'a1', studentId: 'u1', content: 'x' });
      expect(prisma.assignmentSubmission.upsert).toHaveBeenCalled();
    });
  });

  describe('attendance', () => {
    it('lists attendance for a student with optional subject filter', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      await repository.listAttendanceForStudent('u1');
      await repository.listAttendanceForStudent('u1', ['s1']);
      expect(prisma.attendanceRecord.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { studentId: 'u1', subjectId: { in: ['s1'] } } }),
      );
    });

    it('lists attendance for a subject with optional session date', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      await repository.listAttendanceForSubject('s1');
      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId: 's1' } }),
      );
      await repository.listAttendanceForSubject('s1', '2026-08-01');
      expect(prisma.attendanceRecord.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { subjectId: 's1', sessionDate: expect.any(Date) } }),
      );
    });

    it('finds a single attendance record', async () => {
      prisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'r1' });
      const date = new Date('2026-08-01');
      await repository.findAttendance('s1', 'u1', date);
      expect(prisma.attendanceRecord.findUnique).toHaveBeenCalledWith({
        where: {
          subjectId_studentId_sessionDate: { subjectId: 's1', studentId: 'u1', sessionDate: date },
        },
      });
    });

    it('upserts an attendance record with the provided tx client', async () => {
      const tx = { attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) } };
      await repository.upsertAttendance(
        {
          subjectId: 's1',
          studentId: 'u1',
          sessionDate: new Date('2026-01-01'),
          status: 'present',
          markedBy: 'f1',
        },
        tx as never,
      );
      expect(tx.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('upserts attendance without a tx client (uses prisma)', async () => {
      prisma.attendanceRecord.upsert.mockResolvedValue({ id: 'r1' });
      await repository.upsertAttendance({
        subjectId: 's1',
        studentId: 'u1',
        sessionDate: new Date('2026-01-01'),
        status: 'present',
        markedBy: 'f1',
      });
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('counts attendance for a subject', async () => {
      prisma.attendanceRecord.count.mockResolvedValue(5);
      expect(await repository.countAttendanceForSubject('s1')).toBe(5);
      expect(prisma.attendanceRecord.count).toHaveBeenCalledWith({ where: { subjectId: 's1' } });
    });
  });

  describe('internal marks', () => {
    it('creates a batch of marks within a transaction', async () => {
      prisma.internalMark.findFirst.mockResolvedValue(null);
      prisma.internalMark.create.mockResolvedValue({ id: 'mk1' });
      await repository.createMarksBulk([
        { subjectId: 's1', examId: 'e1', studentId: 'u1', marksObtained: 80, maxMarks: 100 },
      ]);
      expect(prisma.internalMark.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attempt: 1 }) }),
      );
    });

    it('updates an existing mark instead of duplicating', async () => {
      prisma.internalMark.findFirst.mockResolvedValue({ id: 'mk1' });
      prisma.internalMark.update.mockResolvedValue({ id: 'mk1' });
      await repository.createMarksBulk([
        { subjectId: 's1', examId: 'e1', studentId: 'u1', marksObtained: 85, maxMarks: 100 },
      ]);
      expect(prisma.internalMark.update).toHaveBeenCalled();
    });

    it('creates marks with a passed tx client', async () => {
      const tx = {
        internalMark: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };
      await repository.createMarksBulk(
        [{ subjectId: 's1', examId: 'e1', studentId: 'u1', marksObtained: 80, maxMarks: 100 }],
        tx as never,
      );
      expect(tx.internalMark.create).toHaveBeenCalled();
    });

    it('lists marks for a student and for an exam', async () => {
      prisma.internalMark.findMany.mockResolvedValue([]);
      await repository.listMarksForStudent('u1');
      await repository.listMarksForExam('e1');
      expect(prisma.internalMark.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { examId: 'e1' } }),
      );
    });

    it('finds a single mark scoped to subject/student/exam', async () => {
      prisma.internalMark.findFirst.mockResolvedValue({ id: 'mk1' });
      await repository.findMark('s1', 'u1', 'e1');
      expect(prisma.internalMark.findFirst).toHaveBeenCalledWith({
        where: { subjectId: 's1', studentId: 'u1', examId: 'e1' },
      });
    });

    it('deletes marks for an exam', async () => {
      prisma.internalMark.deleteMany.mockResolvedValue({ count: 2 });
      await repository.deleteMarksForExam('e1');
      expect(prisma.internalMark.deleteMany).toHaveBeenCalledWith({ where: { examId: 'e1' } });
    });
  });

  describe('student academic context', () => {
    it('finds a profile by user id', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({ id: 'p1' });
      await repository.findProfileByUserId('u1');
      expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });
  });

  describe('calendar & question bank', () => {
    it('lists calendar events with date range and type', async () => {
      prisma.academicCalendarEvent.findMany.mockResolvedValue([]);
      const from = new Date('2026-01-01');
      await repository.listCalendarEvents({ from, to: new Date('2026-12-31'), eventType: 'exam' });
      expect(prisma.academicCalendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventType: 'exam', startAt: expect.any(Object) } }),
      );
    });

    it('lists calendar events with pagination only', async () => {
      prisma.academicCalendarEvent.findMany.mockResolvedValue([]);
      await repository.listCalendarEvents({ skip: 0, take: 50 });
      expect(prisma.academicCalendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('counts calendar events', async () => {
      prisma.academicCalendarEvent.count.mockResolvedValue(3);
      expect(await repository.countCalendarEvents({})).toBe(3);
    });

    it('finds, creates, updates and deletes a calendar event', async () => {
      prisma.academicCalendarEvent.findUnique.mockResolvedValue({ id: 'c1' });
      await repository.findCalendarEventById('c1');
      expect(prisma.academicCalendarEvent.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });

      prisma.academicCalendarEvent.create.mockResolvedValue({ id: 'c1' });
      await repository.createCalendarEvent({ title: 'Holiday', startAt: new Date('2026-08-15') });
      expect(prisma.academicCalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Holiday' }) }),
      );

      prisma.academicCalendarEvent.update.mockResolvedValue({ id: 'c1' });
      await repository.updateCalendarEvent('c1', { title: 'H2' });
      expect(prisma.academicCalendarEvent.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { title: 'H2' },
      });

      prisma.academicCalendarEvent.delete.mockResolvedValue({});
      await repository.deleteCalendarEvent('c1');
      expect(prisma.academicCalendarEvent.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('creates a question with JSON options', async () => {
      prisma.questionBankItem.create.mockResolvedValue({ id: 'q1' });
      await repository.createQuestion({ subjectId: 's1', question: 'Q?', options: ['a'] });
      expect(prisma.questionBankItem.create).toHaveBeenCalled();
    });

    it('lists, finds, updates and deletes questions', async () => {
      prisma.questionBankItem.findMany.mockResolvedValue([]);
      await repository.listQuestionBank('s1');
      expect(prisma.questionBankItem.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: { createdAt: 'desc' },
      });

      prisma.questionBankItem.findUnique.mockResolvedValue({ id: 'q1' });
      await repository.findQuestionById('q1');
      expect(prisma.questionBankItem.findUnique).toHaveBeenCalledWith({ where: { id: 'q1' } });

      prisma.questionBankItem.update.mockResolvedValue({ id: 'q1' });
      await repository.updateQuestion('q1', { question: 'Q2' });
      expect(prisma.questionBankItem.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { question: 'Q2' },
      });

      prisma.questionBankItem.delete.mockResolvedValue({});
      await repository.deleteQuestion('q1');
      expect(prisma.questionBankItem.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
    });
  });

  describe('users (admin)', () => {
    it('lists users by role with search', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repository.listUsersByRole({ role: 'faculty', search: 'jane' });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: { name: 'faculty' } }) }),
      );
    });

    it('lists users by role without search', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repository.listUsersByRole({ role: 'student' });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });

    it('counts users by role', async () => {
      prisma.user.count.mockResolvedValue(3);
      expect(await repository.countUsersByRole({ role: 'student' })).toBe(3);
    });

    it('finds a user by id with role and profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await repository.findUserById('u1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });

    it('finds a user by email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await repository.findUserByEmail('a@b.c');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.c' } });
    });

    it('finds a role by name', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 'r1' });
      await repository.findRoleByName('faculty');
      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: 'faculty' } });
    });

    it('creates a user with verified email', async () => {
      prisma.user.create.mockResolvedValue({ id: 'u1' });
      await repository.createUser({
        email: 'a@b.c',
        passwordHash: 'h',
        fullName: 'A',
        roleId: 'r1',
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('updates a user including the role relation', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u1' });
      await repository.updateUser('u1', { isActive: false });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, include: expect.any(Object) }),
      );
    });

    it('exposes the raw prisma client for transactions', () => {
      expect(repository.client).toBe(prisma);
    });
  });
});
