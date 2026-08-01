import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AcademicsRepository } from './academics.repository';
import { AcademicsService } from './academics.service';

describe('AcademicsService', () => {
  let service: AcademicsService;
  let repository: {
    listDepartments: jest.Mock;
    listSemesters: jest.Mock;
    countSubjects: jest.Mock;
    listSubjects: jest.Mock;
    findSubjectById: jest.Mock;
    listMaterials: jest.Mock;
    listTimetable: jest.Mock;
    listExams: jest.Mock;
    listAssignments: jest.Mock;
    listSubmissionsForAssignments: jest.Mock;
    findAssignmentById: jest.Mock;
    upsertSubmission: jest.Mock;
    listAttendanceForStudent: jest.Mock;
    listMarksForStudent: jest.Mock;
    findProfileByUserId: jest.Mock;
    findSemesterByNumber: jest.Mock;
    findDepartmentByNameOrCode: jest.Mock;
    listSemesters2: jest.Mock;
    countCalendarEvents: jest.Mock;
    listCalendarEvents: jest.Mock;
  };

  const subject = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `CS${id}`,
    name: `Subject ${id}`,
    description: null,
    credit: 4,
    department: { id: 'd1', name: 'CSE', code: 'CSE' },
    semester: { id: 's3', number: 3, name: 'Sem III' },
    faculty: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AcademicsService,
        {
          provide: AcademicsRepository,
          useValue: {
            listDepartments: jest.fn(),
            listSemesters: jest.fn(),
            countSubjects: jest.fn(),
            listSubjects: jest.fn(),
            findSubjectById: jest.fn(),
            listMaterials: jest.fn(),
            listTimetable: jest.fn(),
            listExams: jest.fn(),
            listAssignments: jest.fn(),
            listSubmissionsForAssignments: jest.fn(),
            findAssignmentById: jest.fn(),
            upsertSubmission: jest.fn(),
            listAttendanceForStudent: jest.fn(),
            listMarksForStudent: jest.fn(),
            findProfileByUserId: jest.fn(),
            findSemesterByNumber: jest.fn(),
            findDepartmentByNameOrCode: jest.fn(),
            countCalendarEvents: jest.fn(),
            listCalendarEvents: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AcademicsService);
    repository = module.get(AcademicsRepository) as never;
  });

  describe('listDepartments / listSemesters', () => {
    it('delegates to the repository', async () => {
      repository.listDepartments.mockResolvedValue([{ id: 'd1' }]);
      repository.listSemesters.mockResolvedValue([{ id: 's1' }]);
      await expect(service.listDepartments()).resolves.toEqual([{ id: 'd1' }]);
      await expect(service.listSemesters()).resolves.toEqual([{ id: 's1' }]);
    });
  });

  describe('listSubjects', () => {
    it('returns paginated subjects', async () => {
      repository.countSubjects.mockResolvedValue(1);
      repository.listSubjects.mockResolvedValue([subject('1')]);
      const result = await service.listSubjects({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: '1', credit: 4 });
      expect(repository.listSubjects).toHaveBeenCalledWith({
        departmentId: undefined,
        semesterId: undefined,
        search: undefined,
        skip: 0,
        take: 20,
      });
    });

    it('passes department and semester filters', async () => {
      repository.countSubjects.mockResolvedValue(0);
      repository.listSubjects.mockResolvedValue([]);
      await service.listSubjects({ department: 'd1', semester: 's3', page: 2, limit: 10 });
      expect(repository.listSubjects).toHaveBeenCalledWith({
        departmentId: 'd1',
        semesterId: 's3',
        search: undefined,
        skip: 10,
        take: 10,
      });
    });
  });

  describe('getSubjectMaterials / getSubjectTimetable', () => {
    it('throws 404 for an unknown subject', async () => {
      repository.findSubjectById.mockResolvedValue(null);
      await expect(service.getSubjectMaterials('nope')).rejects.toThrow(NotFoundException);
      await expect(service.getSubjectTimetable('nope')).rejects.toThrow(NotFoundException);
    });

    it('returns materials for a known subject', async () => {
      repository.findSubjectById.mockResolvedValue(subject('1'));
      repository.listMaterials.mockResolvedValue([{ id: 'm1' }]);
      await expect(service.getSubjectMaterials('1')).resolves.toEqual([{ id: 'm1' }]);
      expect(repository.listMaterials).toHaveBeenCalledWith('1');
    });

    it('returns timetable for a known subject', async () => {
      repository.findSubjectById.mockResolvedValue(subject('1'));
      repository.listTimetable.mockResolvedValue([{ id: 't1' }]);
      await expect(service.getSubjectTimetable('1')).resolves.toEqual([{ id: 't1' }]);
    });
  });

  describe('listMyExams', () => {
    it('returns empty when the student has no subjects', async () => {
      repository.findProfileByUserId.mockResolvedValue({ department: 'CSE', currentSemester: 3 });
      repository.findDepartmentByNameOrCode.mockResolvedValue({ id: 'd1' });
      repository.findSemesterByNumber.mockResolvedValue({ id: 's3' });
      repository.listSubjects.mockResolvedValue([]);
      await expect(service.listMyExams('u1')).resolves.toEqual([]);
      expect(repository.listExams).not.toHaveBeenCalled();
    });

    it('maps exams for the student subjects', async () => {
      repository.findProfileByUserId.mockResolvedValue({ department: 'CSE', currentSemester: 3 });
      repository.findDepartmentByNameOrCode.mockResolvedValue({ id: 'd1' });
      repository.findSemesterByNumber.mockResolvedValue({ id: 's3' });
      repository.listSubjects.mockResolvedValue([subject('1')]);
      repository.listExams.mockResolvedValue([
        {
          id: 'e1',
          title: 'IT1',
          examType: 'internal',
          maxMarks: 50,
          scheduledAt: new Date('2026-08-01'),
          subjectId: '1',
          subject: subject('1'),
        },
      ]);
      const result = await service.listMyExams('u1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'e1', title: 'IT1' });
    });
  });

  describe('listMyAssignments + submitAssignment', () => {
    it('includes submission status per assignment', async () => {
      repository.findProfileByUserId.mockResolvedValue(null);
      repository.listSubjects.mockResolvedValue([subject('1')]);
      repository.listAssignments.mockResolvedValue([
        {
          id: 'a1',
          subjectId: '1',
          title: 'A1',
          subject: subject('1'),
          dueAt: null,
          description: null,
          maxScore: null,
        },
      ]);
      repository.listSubmissionsForAssignments.mockResolvedValue([
        {
          assignmentId: 'a1',
          id: 'sub1',
          status: 'submitted',
          submittedAt: new Date('2026-07-01'),
          score: null,
        },
      ]);
      const result = await service.listMyAssignments('u1');
      expect(result[0].submission).toMatchObject({ id: 'sub1', status: 'submitted' });
    });

    it('submits an assignment for a known assignment', async () => {
      repository.findAssignmentById.mockResolvedValue({ id: 'a1', subjectId: '1' });
      repository.upsertSubmission.mockResolvedValue({
        id: 'sub1',
        assignmentId: 'a1',
        status: 'submitted',
        submittedAt: new Date(),
        content: 'x',
        attachmentUrl: null,
      });
      const result = await service.submitAssignment('u1', 'a1', { content: 'x' });
      expect(result).toMatchObject({ id: 'sub1', status: 'submitted' });
      expect(repository.upsertSubmission).toHaveBeenCalledWith({
        assignmentId: 'a1',
        studentId: 'u1',
        content: 'x',
        attachmentUrl: undefined,
      });
    });

    it('throws 404 when the assignment does not exist', async () => {
      repository.findAssignmentById.mockResolvedValue(null);
      await expect(service.submitAssignment('u1', 'nope', { content: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyAttendance', () => {
    it('returns an empty list when no records exist', async () => {
      repository.listAttendanceForStudent.mockResolvedValue([]);
      await expect(service.getMyAttendance('u1')).resolves.toEqual({ data: [] });
    });

    it('computes per-subject attendance percentage', async () => {
      repository.listAttendanceForStudent.mockResolvedValue([
        {
          id: 'r1',
          subjectId: '1',
          status: 'present',
          sessionDate: new Date('2026-08-01'),
          subject: subject('1'),
        },
        {
          id: 'r2',
          subjectId: '1',
          status: 'absent',
          sessionDate: new Date('2026-08-02'),
          subject: subject('1'),
        },
        {
          id: 'r3',
          subjectId: '2',
          status: 'present',
          sessionDate: new Date('2026-08-03'),
          subject: subject('2'),
        },
      ]);
      const result = await service.getMyAttendance('u1');
      expect(result.data).toHaveLength(2);
      const sub1 = result.data.find((d) => d.subjectId === '1')!;
      expect(sub1.percentage).toBe(50);
      expect(sub1.totalSessions).toBe(2);
      expect(sub1.attendedSessions).toBe(1);
    });
  });

  describe('getMyMarks', () => {
    it('maps marks rows', async () => {
      repository.listMarksForStudent.mockResolvedValue([
        {
          id: 'mk1',
          subjectId: '1',
          subject: subject('1'),
          examId: 'e1',
          exam: { id: 'e1', title: 'IT1', examType: 'internal' },
          marksObtained: 40,
          maxMarks: 50,
          attempt: 1,
        },
      ]);
      const result = await service.getMyMarks('u1');
      expect(result[0]).toMatchObject({ id: 'mk1', marksObtained: 40 });
    });
  });

  describe('getMyGpa', () => {
    it('returns a null GPA when no marks exist', async () => {
      repository.findProfileByUserId.mockResolvedValue({ department: 'CSE', currentSemester: 3 });
      repository.findSemesterByNumber.mockResolvedValue({ id: 's3' });
      repository.findDepartmentByNameOrCode.mockResolvedValue({ id: 'd1' });
      repository.listSubjects.mockResolvedValue([]);
      const result = await service.getMyGpa('u1');
      expect(result.gpa).toBeNull();
      expect(result.semester).toBe(3);
    });

    it('computes a GPA from marks', async () => {
      repository.findProfileByUserId.mockResolvedValue({ department: 'CSE', currentSemester: 3 });
      repository.findSemesterByNumber.mockResolvedValue({ id: 's3' });
      repository.findDepartmentByNameOrCode.mockResolvedValue({ id: 'd1' });
      repository.listSubjects.mockResolvedValue([subject('1'), subject('2')]);
      repository.listMarksForStudent.mockResolvedValue([
        { subjectId: '1', credit: 4, marksObtained: 90, maxMarks: 100, attempt: 1 },
        { subjectId: '2', credit: 4, marksObtained: 80, maxMarks: 100, attempt: 1 },
      ]);
      const result = await service.getMyGpa('u1');
      expect(result.gpa).toBe(9.5);
      expect(result.totalCredits).toBe(8);
    });
  });

  describe('getMyCgpa', () => {
    it('returns null CGPA with no marks', async () => {
      repository.listMarksForStudent.mockResolvedValue([]);
      repository.listSemesters.mockResolvedValue([]);
      const result = await service.getMyCgpa('u1');
      expect(result.cgpa).toBeNull();
    });

    it('groups marks across semesters', async () => {
      repository.listMarksForStudent.mockResolvedValue([
        {
          subjectId: '1',
          subject: { credit: 4, semesterId: 's1' },
          marksObtained: 90,
          maxMarks: 100,
          attempt: 1,
        },
        {
          subjectId: '2',
          subject: { credit: 4, semesterId: 's2' },
          marksObtained: 80,
          maxMarks: 100,
          attempt: 1,
        },
      ]);
      repository.listSemesters.mockResolvedValue([
        { id: 's1', number: 1 },
        { id: 's2', number: 2 },
      ]);
      const result = await service.getMyCgpa('u1');
      expect(result.cgpa).toBe(9.5);
    });
  });

  describe('listCalendarEvents', () => {
    it('returns paginated events with ISO dates', async () => {
      repository.countCalendarEvents.mockResolvedValue(1);
      repository.listCalendarEvents.mockResolvedValue([
        {
          id: 'c1',
          title: 'Holiday',
          description: null,
          eventType: 'holiday',
          startAt: new Date('2026-08-15'),
          endAt: null,
          allDay: true,
        },
      ]);
      const result = await service.listCalendarEvents({ page: 1, limit: 50 });
      expect(result.meta.total).toBe(1);
      expect(result.data[0].startAt).toBe('2026-08-15T00:00:00.000Z');
    });

    it('passes date filters to the repository', async () => {
      repository.countCalendarEvents.mockResolvedValue(0);
      repository.listCalendarEvents.mockResolvedValue([]);
      await service.listCalendarEvents({
        from: '2026-08-01',
        to: '2026-08-31',
        eventType: 'exam',
        page: 1,
        limit: 50,
      });
      expect(repository.listCalendarEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'exam',
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });
  });
});
