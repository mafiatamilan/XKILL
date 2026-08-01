import { FacultyController } from './faculty-academics.controller';
import { FacultyAcademicsService } from './faculty-academics.service';

describe('FacultyController', () => {
  const faculty = {
    listMySubjects: jest.fn(),
    getSubject: jest.fn(),
    createSubject: jest.fn(),
    updateSubject: jest.fn(),
    deleteSubject: jest.fn(),
    listMaterials: jest.fn(),
    createMaterial: jest.fn(),
    updateMaterial: jest.fn(),
    deleteMaterial: jest.fn(),
    markAttendance: jest.fn(),
    getAttendance: jest.fn(),
    listAssignments: jest.fn(),
    createAssignment: jest.fn(),
    updateAssignment: jest.fn(),
    deleteAssignment: jest.fn(),
    listExams: jest.fn(),
    createExam: jest.fn(),
    updateExam: jest.fn(),
    deleteExam: jest.fn(),
    enterBulkMarks: jest.fn(),
    getExamMarks: jest.fn(),
    getStudentAnalytics: jest.fn(),
    listQuestions: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
  };
  let controller: FacultyController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FacultyController(faculty as unknown as FacultyAcademicsService);
  });

  const user = { id: 'fac-1' } as never;

  it('lists, gets, creates, updates and deletes own subjects', () => {
    controller.listSubjects(user, { page: 1, limit: 20 } as never);
    expect(faculty.listMySubjects).toHaveBeenCalledWith('fac-1', 1, 20);
    controller.getSubject(user, 'sub-1');
    expect(faculty.getSubject).toHaveBeenCalledWith('fac-1', 'sub-1');
    controller.createSubject(user, { code: 'CS301', name: 'DSA' } as never, '1.1.1.1');
    expect(faculty.createSubject).toHaveBeenCalledWith(
      'fac-1',
      { code: 'CS301', name: 'DSA' },
      '1.1.1.1',
    );
    controller.updateSubject(user, 'sub-1', { name: 'X' } as never, '1.1.1.1');
    expect(faculty.updateSubject).toHaveBeenCalledWith('fac-1', 'sub-1', { name: 'X' }, '1.1.1.1');
    controller.deleteSubject(user, 'sub-1', '1.1.1.1');
    expect(faculty.deleteSubject).toHaveBeenCalledWith('fac-1', 'sub-1', '1.1.1.1');
  });

  it('handles materials under a subject', () => {
    controller.listMaterials(user, 'sub-1');
    expect(faculty.listMaterials).toHaveBeenCalledWith('fac-1', 'sub-1');
    controller.createMaterial(
      user,
      'sub-1',
      { title: 'T', type: 'note', url: 'u' } as never,
      '1.1.1.1',
    );
    expect(faculty.createMaterial).toHaveBeenCalledWith(
      'fac-1',
      'sub-1',
      { title: 'T', type: 'note', url: 'u' },
      '1.1.1.1',
    );
    controller.updateMaterial(user, 'm-1', { title: 'T2' } as never, '1.1.1.1');
    expect(faculty.updateMaterial).toHaveBeenCalledWith('fac-1', 'm-1', { title: 'T2' }, '1.1.1.1');
    controller.deleteMaterial(user, 'm-1', '1.1.1.1');
    expect(faculty.deleteMaterial).toHaveBeenCalledWith('fac-1', 'm-1', '1.1.1.1');
  });

  it('marks attendance and reads it back', () => {
    controller.markAttendance(
      user,
      { subjectId: 'sub-1', sessionDate: '2026-08-01', records: [] } as never,
      '1.1.1.1',
    );
    expect(faculty.markAttendance).toHaveBeenCalledWith(
      'fac-1',
      { subjectId: 'sub-1', sessionDate: '2026-08-01', records: [] },
      '1.1.1.1',
    );
    controller.getAttendance(user, 'sub-1', '2026-08-01');
    expect(faculty.getAttendance).toHaveBeenCalledWith('fac-1', 'sub-1', '2026-08-01');
  });

  it('handles assignments and exams CRUD', () => {
    controller.listAssignments(user, 'sub-1');
    expect(faculty.listAssignments).toHaveBeenCalledWith('fac-1', 'sub-1');
    controller.createAssignment(user, 'sub-1', { title: 'A1' } as never, '1.1.1.1');
    expect(faculty.createAssignment).toHaveBeenCalledWith(
      'fac-1',
      'sub-1',
      { title: 'A1' },
      '1.1.1.1',
    );
    controller.updateAssignment(user, 'a-1', { title: 'A2' } as never, '1.1.1.1');
    expect(faculty.updateAssignment).toHaveBeenCalledWith(
      'fac-1',
      'a-1',
      { title: 'A2' },
      '1.1.1.1',
    );
    controller.deleteAssignment(user, 'a-1', '1.1.1.1');
    expect(faculty.deleteAssignment).toHaveBeenCalledWith('fac-1', 'a-1', '1.1.1.1');
    controller.createExam(user, 'sub-1', { title: 'IT1' } as never, '1.1.1.1');
    expect(faculty.createExam).toHaveBeenCalledWith('fac-1', 'sub-1', { title: 'IT1' }, '1.1.1.1');
    controller.updateExam(user, 'e-1', { title: 'IT2' } as never, '1.1.1.1');
    expect(faculty.updateExam).toHaveBeenCalledWith('fac-1', 'e-1', { title: 'IT2' }, '1.1.1.1');
    controller.deleteExam(user, 'e-1', '1.1.1.1');
    expect(faculty.deleteExam).toHaveBeenCalledWith('fac-1', 'e-1', '1.1.1.1');
  });

  it('enters bulk marks and lists the gradebook', () => {
    controller.enterBulkMarks(
      user,
      'e-1',
      { marks: [{ studentId: 'u1', marksObtained: 80 }] } as never,
      '1.1.1.1',
    );
    expect(faculty.enterBulkMarks).toHaveBeenCalledWith(
      'fac-1',
      'e-1',
      { marks: [{ studentId: 'u1', marksObtained: 80 }] },
      '1.1.1.1',
    );
    controller.getExamMarks(user, 'e-1');
    expect(faculty.getExamMarks).toHaveBeenCalledWith('fac-1', 'e-1');
  });

  it('gets student analytics', () => {
    controller.getStudentAnalytics(user, 'stu-1');
    expect(faculty.getStudentAnalytics).toHaveBeenCalledWith('fac-1', 'stu-1');
  });

  it('handles question bank CRUD', () => {
    controller.listQuestions(user, 'sub-1');
    expect(faculty.listQuestions).toHaveBeenCalledWith('fac-1', 'sub-1');
    controller.createQuestion(user, 'sub-1', { question: 'Q' } as never, '1.1.1.1');
    expect(faculty.createQuestion).toHaveBeenCalledWith(
      'fac-1',
      'sub-1',
      { question: 'Q' },
      '1.1.1.1',
    );
    controller.updateQuestion(user, 'q-1', { question: 'Q2' } as never, '1.1.1.1');
    expect(faculty.updateQuestion).toHaveBeenCalledWith(
      'fac-1',
      'q-1',
      { question: 'Q2' },
      '1.1.1.1',
    );
    controller.deleteQuestion(user, 'q-1', '1.1.1.1');
    expect(faculty.deleteQuestion).toHaveBeenCalledWith('fac-1', 'q-1', '1.1.1.1');
  });
});
