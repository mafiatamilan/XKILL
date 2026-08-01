import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { AcademicsRepository } from './academics.repository';
import { FacultyAcademicsService } from './faculty-academics.service';

const subject = (id: string, facultyId: string, overrides: Record<string, unknown> = {}) => ({
  id,
  code: `CS${id}`,
  name: `Subject ${id}`,
  credit: 4,
  departmentId: 'd1',
  semesterId: 's3',
  facultyId,
  department: { id: 'd1', name: 'CSE', code: 'CSE' },
  semester: { id: 's3', number: 3, name: 'Sem III' },
  faculty: { id: facultyId, fullName: 'F', email: 'f@x.com' },
  ...overrides,
});

describe('FacultyAcademicsService', () => {
  let service: FacultyAcademicsService;
  let repository: {
    countSubjects: jest.Mock;
    listSubjects: jest.Mock;
    findSubjectById: jest.Mock;
    findSubjectByFacultyAndId: jest.Mock;
    findSubjectByCode: jest.Mock;
    findDepartmentById: jest.Mock;
    findSemesterById: jest.Mock;
    createSubject: jest.Mock;
    updateSubject: jest.Mock;
    deleteSubject: jest.Mock;
    listMaterials: jest.Mock;
    createMaterial: jest.Mock;
    findMaterialById: jest.Mock;
    updateMaterial: jest.Mock;
    deleteMaterial: jest.Mock;
    listAttendanceForSubject: jest.Mock;
    upsertAttendance: jest.Mock;
    listAssignmentsForSubject: jest.Mock;
    createAssignment: jest.Mock;
    findAssignmentById: jest.Mock;
    updateAssignment: jest.Mock;
    deleteAssignment: jest.Mock;
    listExamsForSubject: jest.Mock;
    createExam: jest.Mock;
    findExamById: jest.Mock;
    updateExam: jest.Mock;
    deleteExam: jest.Mock;
    listMarksForExam: jest.Mock;
    createMarksBulk: jest.Mock;
    findUserById: jest.Mock;
    listAttendanceForStudent: jest.Mock;
    listMarksForStudent: jest.Mock;
    listQuestionBank: jest.Mock;
    createQuestion: jest.Mock;
    findQuestionById: jest.Mock;
    updateQuestion: jest.Mock;
    deleteQuestion: jest.Mock;
    client: { $transaction: jest.Mock };
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    const tx = {
      user: { findFirst: jest.fn() },
      attendanceRecord: { upsert: jest.fn() },
      internalMark: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const txRunner = jest.fn((cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
    const module = await Test.createTestingModule({
      providers: [
        FacultyAcademicsService,
        {
          provide: AcademicsRepository,
          useValue: {
            countSubjects: jest.fn(),
            listSubjects: jest.fn(),
            findSubjectById: jest.fn(),
            findSubjectByFacultyAndId: jest.fn(),
            findSubjectByCode: jest.fn(),
            findDepartmentById: jest.fn(),
            findSemesterById: jest.fn(),
            createSubject: jest.fn(),
            updateSubject: jest.fn(),
            deleteSubject: jest.fn(),
            listMaterials: jest.fn(),
            createMaterial: jest.fn(),
            findMaterialById: jest.fn(),
            updateMaterial: jest.fn(),
            deleteMaterial: jest.fn(),
            listAttendanceForSubject: jest.fn(),
            upsertAttendance: jest.fn(),
            listAssignmentsForSubject: jest.fn(),
            createAssignment: jest.fn(),
            findAssignmentById: jest.fn(),
            updateAssignment: jest.fn(),
            deleteAssignment: jest.fn(),
            listExamsForSubject: jest.fn(),
            createExam: jest.fn(),
            findExamById: jest.fn(),
            updateExam: jest.fn(),
            deleteExam: jest.fn(),
            listMarksForExam: jest.fn(),
            createMarksBulk: jest.fn(),
            findUserById: jest.fn(),
            listAttendanceForStudent: jest.fn(),
            listMarksForStudent: jest.fn(),
            listQuestionBank: jest.fn(),
            createQuestion: jest.fn(),
            findQuestionById: jest.fn(),
            updateQuestion: jest.fn(),
            deleteQuestion: jest.fn(),
            client: { $transaction: txRunner },
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get(FacultyAcademicsService);
    repository = module.get(AcademicsRepository) as never;
    audit = module.get(AuditService) as never;
  });

  describe('subjects', () => {
    it('lists only the subjects assigned to the faculty member', async () => {
      repository.countSubjects.mockResolvedValue(2);
      repository.listSubjects.mockResolvedValue([subject('1', 'f1'), subject('2', 'f2')]);
      const result = (await service.listMySubjects('f1', 1, 20)) as {
        data: Array<{ id: string }>;
        meta: { total: number };
      };
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('1');
      expect(result.meta.total).toBe(2);
    });

    it('returns a 404 for an unknown subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(null);
      await expect(service.getSubject('f1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when the subject belongs to another faculty member', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(subject('1', 'f2'));
      await expect(service.getSubject('f1', '1')).rejects.toThrow(ForbiddenException);
    });

    it('creates a subject assigned to the faculty member', async () => {
      repository.findSubjectByCode.mockResolvedValue(null);
      repository.findDepartmentById.mockResolvedValue({ id: 'd1' });
      repository.findSemesterById.mockResolvedValue({ id: 's3' });
      repository.createSubject.mockResolvedValue({ id: 's1' });
      repository.findSubjectById.mockResolvedValue(subject('s1', 'f1'));
      const result = (await service.createSubject(
        'f1',
        { code: 'CS301', name: 'DSA', departmentId: 'd1', semesterId: 's3' },
        '1.2.3.4',
      ))!;
      expect(repository.createSubject).toHaveBeenCalledWith(
        expect.objectContaining({ facultyId: 'f1' }),
      );
      expect(result.id).toBe('s1');
      expect(audit.record).toHaveBeenCalled();
    });

    it('rejects a duplicate subject code', async () => {
      repository.findSubjectByCode.mockResolvedValue({ id: 's1' });
      await expect(
        service.createSubject('f1', {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'd1',
          semesterId: 's3',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown department/semester on create', async () => {
      repository.findSubjectByCode.mockResolvedValue(null);
      repository.findDepartmentById.mockResolvedValue(null);
      await expect(
        service.createSubject('f1', {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'nope',
          semesterId: 's3',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      const result = await service.getSubject('f1', '1');
      expect(result).toMatchObject({ id: '1' });
    });

    it('rejects an unknown semester on create', async () => {
      repository.findSubjectByCode.mockResolvedValue(null);
      repository.findDepartmentById.mockResolvedValue({ id: 'd1' });
      repository.findSemesterById.mockResolvedValue(null);
      await expect(
        service.createSubject('f1', {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'd1',
          semesterId: 'nope',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes an owned subject and audits', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.deleteSubject.mockResolvedValue(undefined);
      await service.deleteSubject('f1', '1', '1.2.3.4');
      expect(repository.deleteSubject).toHaveBeenCalledWith('1');
      expect(audit.record).toHaveBeenCalled();
    });

    it('lists materials for an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listMaterials.mockResolvedValue([{ id: 'm1' }]);
      const result = await service.listMaterials('f1', '1');
      expect(result).toHaveLength(1);
    });

    it('updates and deletes only owned subjects', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.updateSubject.mockResolvedValue({ id: '1', name: 'New', credit: 4 });
      repository.findSubjectById.mockResolvedValue(subject('1', 'f1', { name: 'New' }));
      await service.updateSubject('f1', '1', { name: 'New' }, '1.2.3.4');
      expect(repository.updateSubject).toHaveBeenCalledWith('1', { name: 'New' });

      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(subject('1', 'f2'));
      await expect(service.updateSubject('f1', '1', { name: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.deleteSubject('f1', '1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('materials', () => {
    it('creates a material on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createMaterial.mockResolvedValue({ id: 'm1', title: 'T' });
      const result = await service.createMaterial(
        'f1',
        '1',
        { title: 'T', type: 'note', url: 'u' },
        '1.2.3.4',
      );
      expect(result.id).toBe('m1');
      expect(repository.createMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ uploadedBy: 'f1', subjectId: '1' }),
      );
    });

    it('rejects materials on a subject owned by someone else', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(subject('1', 'f2'));
      await expect(
        service.createMaterial('f1', '1', { title: 'T', type: 'note', url: 'u' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 when a material does not exist on update/delete', async () => {
      repository.findMaterialById.mockResolvedValue(null);
      await expect(service.updateMaterial('f1', 'nope', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteMaterial('f1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('updates and deletes a material on an owned subject', async () => {
      repository.findMaterialById.mockResolvedValue({ id: 'm1', subjectId: '1' });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.updateMaterial.mockResolvedValue({ id: 'm1', title: 'T2' });
      const updated = await service.updateMaterial('f1', 'm1', { title: 'T2' }, '1.2.3.4');
      expect(updated).toMatchObject({ id: 'm1' });
      expect(audit.record).toHaveBeenCalled();

      repository.deleteMaterial.mockResolvedValue(undefined);
      await service.deleteMaterial('f1', 'm1', '1.2.3.4');
      expect(repository.deleteMaterial).toHaveBeenCalledWith('m1');
    });

    it('rejects material update when the subject is owned by someone else', async () => {
      repository.findMaterialById.mockResolvedValue({ id: 'm1', subjectId: '1' });
      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(subject('1', 'f2'));
      await expect(service.updateMaterial('f1', 'm1', { title: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('attendance', () => {
    it('marks attendance transactionally, validating students', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.client.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({
            user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
            attendanceRecord: { upsert: jest.fn() },
          }),
      );
      repository.upsertAttendance.mockResolvedValue({ id: 'r1' });
      const result = await service.markAttendance(
        'f1',
        {
          subjectId: '1',
          sessionDate: '2026-08-01',
          records: [{ studentId: 'u1', status: 'present' }],
        },
        '1.2.3.4',
      );
      expect(result.count).toBe(1);
      expect(audit.record).toHaveBeenCalled();
    });

    it('rolls back (throws) when a student is invalid mid-batch', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.client.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({
            user: { findFirst: jest.fn().mockResolvedValue(null) },
            attendanceRecord: { upsert: jest.fn() },
          }),
      );
      await expect(
        service.markAttendance('f1', {
          subjectId: '1',
          sessionDate: '2026-08-01',
          records: [{ studentId: 'ghost', status: 'present' }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.upsertAttendance).not.toHaveBeenCalled();
    });

    it('rejects an empty records array', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      await expect(
        service.markAttendance('f1', { subjectId: '1', sessionDate: '2026-08-01', records: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns attendance for a subject with an optional session date', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listAttendanceForSubject.mockResolvedValue([{ id: 'r1', status: 'present' }]);
      const withDate = await service.getAttendance('f1', '1', '2026-08-01');
      expect(withDate).toHaveLength(1);
      const withoutDate = await service.getAttendance('f1', '1');
      expect(withoutDate).toHaveLength(1);
      expect(repository.listAttendanceForSubject).toHaveBeenLastCalledWith('1', undefined);
    });
  });

  describe('assignments & exams', () => {
    it('creates an assignment on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createAssignment.mockResolvedValue({ id: 'a1' });
      repository.findAssignmentById.mockResolvedValue({ id: 'a1' });
      const result = (await service.createAssignment('f1', '1', { title: 'A1' }, '1.2.3.4'))!;
      expect(result.id).toBe('a1');
      expect(audit.record).toHaveBeenCalled();
    });

    it('throws 404 updating an unknown assignment', async () => {
      repository.findAssignmentById.mockResolvedValue(null);
      await expect(service.updateAssignment('f1', 'nope', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lists, updates and deletes assignments on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listAssignmentsForSubject.mockResolvedValue([{ id: 'a1' }]);
      const listed = await service.listAssignments('f1', '1');
      expect(listed).toHaveLength(1);

      repository.findAssignmentById.mockResolvedValue({ id: 'a1', subjectId: '1' });
      repository.updateAssignment.mockResolvedValue({ id: 'a1' });
      const updated = await service.updateAssignment('f1', 'a1', { title: 'A2' }, '1.2.3.4');
      expect(updated).toMatchObject({ id: 'a1' });
      expect(audit.record).toHaveBeenCalled();

      repository.deleteAssignment.mockResolvedValue(undefined);
      await service.deleteAssignment('f1', 'a1', '1.2.3.4');
      expect(repository.deleteAssignment).toHaveBeenCalledWith('a1');
    });

    it('throws 404 deleting an unknown assignment', async () => {
      repository.findAssignmentById.mockResolvedValue(null);
      await expect(service.deleteAssignment('f1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('creates an assignment with a due date', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createAssignment.mockResolvedValue({ id: 'a1' });
      repository.findAssignmentById.mockResolvedValue({ id: 'a1' });
      await service.createAssignment('f1', '1', { title: 'A1', dueAt: '2026-09-01T00:00:00Z' });
      expect(repository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ dueAt: expect.any(Date) }),
      );
    });

    it('creates an exam with a scheduled date', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createExam.mockResolvedValue({ id: 'e1' });
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1' });
      await service.createExam('f1', '1', {
        title: 'IT1',
        examType: 'internal',
        maxMarks: 50,
        scheduledAt: '2026-09-01T00:00:00Z',
      });
      expect(repository.createExam).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledAt: expect.any(Date) }),
      );
    });

    it('creates an exam with defaults and audits', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createExam.mockResolvedValue({ id: 'e1' });
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1' });
      const result = (await service.createExam('f1', '1', { title: 'IT1' }, '1.2.3.4'))!;
      expect(repository.createExam).toHaveBeenCalledWith(
        expect.objectContaining({ maxMarks: undefined }),
      );
      expect(result.id).toBe('e1');
    });

    it('lists, updates and deletes exams on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listExamsForSubject.mockResolvedValue([{ id: 'e1' }]);
      const listed = await service.listExams('f1', '1');
      expect(listed).toHaveLength(1);

      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1' });
      repository.updateExam.mockResolvedValue({ id: 'e1' });
      const updated = await service.updateExam('f1', 'e1', { title: 'IT2' }, '1.2.3.4');
      expect(updated).toMatchObject({ id: 'e1' });

      repository.deleteExam.mockResolvedValue(undefined);
      await service.deleteExam('f1', 'e1', '1.2.3.4');
      expect(repository.deleteExam).toHaveBeenCalledWith('e1');
    });

    it('throws 404 deleting an unknown exam', async () => {
      repository.findExamById.mockResolvedValue(null);
      await expect(service.deleteExam('f1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 updating an unknown exam', async () => {
      repository.findExamById.mockResolvedValue(null);
      await expect(service.updateExam('f1', 'nope', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulk marks entry', () => {
    it('enters marks transactionally', async () => {
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1', maxMarks: 100 });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.client.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({ user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) } }),
      );
      const result = await service.enterBulkMarks(
        'f1',
        'e1',
        { marks: [{ studentId: 'u1', marksObtained: 80 }] },
        '1.2.3.4',
      );
      expect(result.count).toBe(1);
      expect(repository.createMarksBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ studentId: 'u1', marksObtained: 80, maxMarks: 100 }),
        ]),
        expect.anything(),
      );
    });

    it('throws 404 for an unknown exam', async () => {
      repository.findExamById.mockResolvedValue(null);
      await expect(
        service.enterBulkMarks('f1', 'nope', { marks: [{ studentId: 'u1', marksObtained: 80 }] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 400 when a mark exceeds the exam max', async () => {
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1', maxMarks: 100 });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      await expect(
        service.enterBulkMarks('f1', 'e1', { marks: [{ studentId: 'u1', marksObtained: 101 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 400 for an invalid student mid-batch', async () => {
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1', maxMarks: 100 });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.client.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({ user: { findFirst: jest.fn().mockResolvedValue(null) } }),
      );
      await expect(
        service.enterBulkMarks('f1', 'e1', { marks: [{ studentId: 'ghost', marksObtained: 80 }] }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createMarksBulk).not.toHaveBeenCalled();
    });

    it('rejects an empty marks array', async () => {
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1', maxMarks: 100 });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      await expect(service.enterBulkMarks('f1', 'e1', { marks: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns marks for an owned exam', async () => {
      repository.findExamById.mockResolvedValue({ id: 'e1', subjectId: '1', maxMarks: 100 });
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listMarksForExam.mockResolvedValue([{ id: 'mk1', marksObtained: 80 }]);
      const marks = await service.getExamMarks('f1', 'e1');
      expect(marks).toHaveLength(1);
    });

    it('throws 404 for an unknown exam on getExamMarks', async () => {
      repository.findExamById.mockResolvedValue(null);
      await expect(service.getExamMarks('f1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('student analytics', () => {
    it('returns analytics for a student in the faculty subjects', async () => {
      repository.findUserById.mockResolvedValue({ id: 'u1', fullName: 'Student' });
      repository.listSubjects.mockResolvedValue([subject('1', 'f1'), subject('2', 'f2')]);
      repository.listAttendanceForStudent.mockResolvedValue([
        { id: 'r1', subjectId: '1', status: 'present' },
        { id: 'r2', subjectId: '1', status: 'absent' },
      ]);
      repository.listMarksForStudent.mockResolvedValue([
        { subjectId: '1', credit: 4, marksObtained: 90, maxMarks: 100, attempt: 1 },
      ]);
      const result = await service.getStudentAnalytics('f1', 'u1');
      expect(result.studentId).toBe('u1');
      expect(result.attendancePercentage).toBe(50);
      expect(result.gpa).toBe(10);
    });

    it('falls back to subject credit when a mark subject is not in the faculty map', async () => {
      repository.findUserById.mockResolvedValue({ id: 'u1', fullName: 'Student' });
      repository.listSubjects.mockResolvedValue([subject('1', 'f1')]);
      repository.listAttendanceForStudent.mockResolvedValue([]);
      repository.listMarksForStudent.mockResolvedValue([
        {
          subjectId: 'unmapped',
          subject: { credit: 3 },
          marksObtained: 80,
          maxMarks: 100,
          attempt: 1,
        },
      ]);
      const result = await service.getStudentAnalytics('f1', 'u1');
      expect(result.gpa).toBe(9);
    });

    it('throws 403 when the faculty has no assigned subjects', async () => {
      repository.findUserById.mockResolvedValue({ id: 'u1', fullName: 'Student' });
      repository.listSubjects.mockResolvedValue([subject('1', 'f2')]);
      await expect(service.getStudentAnalytics('f1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 for an unknown student', async () => {
      repository.findUserById.mockResolvedValue(null);
      await expect(service.getStudentAnalytics('f1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('question bank', () => {
    it('creates a question on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.createQuestion.mockResolvedValue({ id: 'q1', question: 'Q' });
      const result = await service.createQuestion('f1', '1', { question: 'Q' }, '1.2.3.4');
      expect(result.id).toBe('q1');
      expect(repository.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'f1' }),
      );
    });

    it('throws 404 when a question is not found on update/delete', async () => {
      repository.findQuestionById.mockResolvedValue(null);
      await expect(service.updateQuestion('f1', 'nope', { question: 'Q' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteQuestion('f1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('lists, updates and deletes questions on an owned subject', async () => {
      repository.findSubjectByFacultyAndId.mockResolvedValue(subject('1', 'f1'));
      repository.listQuestionBank.mockResolvedValue([{ id: 'q1' }]);
      const listed = await service.listQuestions('f1', '1');
      expect(listed).toHaveLength(1);

      repository.findQuestionById.mockResolvedValue({ id: 'q1', subjectId: '1' });
      repository.updateQuestion.mockResolvedValue({ id: 'q1', question: 'Q2' });
      const updated = await service.updateQuestion('f1', 'q1', { question: 'Q2' }, '1.2.3.4');
      expect(updated).toMatchObject({ id: 'q1' });
      expect(audit.record).toHaveBeenCalled();

      repository.deleteQuestion.mockResolvedValue(undefined);
      await service.deleteQuestion('f1', 'q1', '1.2.3.4');
      expect(repository.deleteQuestion).toHaveBeenCalledWith('q1');
    });

    it('rejects question update when the subject is owned by someone else', async () => {
      repository.findQuestionById.mockResolvedValue({ id: 'q1', subjectId: '1' });
      repository.findSubjectByFacultyAndId.mockResolvedValue(null);
      repository.findSubjectById.mockResolvedValue(subject('1', 'f2'));
      await expect(service.updateQuestion('f1', 'q1', { question: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
