import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';

describe('AcademicsController', () => {
  const academics = {
    listDepartments: jest.fn(),
    listSemesters: jest.fn(),
    listSubjects: jest.fn(),
    getSubjectMaterials: jest.fn(),
    getSubjectTimetable: jest.fn(),
    listMyExams: jest.fn(),
    listMyAssignments: jest.fn(),
    submitAssignment: jest.fn(),
    getMyAttendance: jest.fn(),
    getMyMarks: jest.fn(),
    getMyGpa: jest.fn(),
    getMyCgpa: jest.fn(),
    listCalendarEvents: jest.fn(),
  };
  let controller: AcademicsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AcademicsController(academics as unknown as AcademicsService);
  });

  const user = { id: 'user-1' } as never;

  it('lists reference departments and semesters', () => {
    controller.listDepartments();
    expect(academics.listDepartments).toHaveBeenCalled();
    controller.listSemesters();
    expect(academics.listSemesters).toHaveBeenCalled();
  });

  it('lists subjects with the query filters', () => {
    controller.listSubjects({ department: 'd1', semester: 's3', page: 1, limit: 20 } as never);
    expect(academics.listSubjects).toHaveBeenCalledWith({
      department: 'd1',
      semester: 's3',
      page: 1,
      limit: 20,
    });
  });

  it('gets subject materials and timetable', () => {
    controller.getSubjectMaterials('sub-1');
    expect(academics.getSubjectMaterials).toHaveBeenCalledWith('sub-1');
    controller.getSubjectTimetable('sub-1');
    expect(academics.getSubjectTimetable).toHaveBeenCalledWith('sub-1');
  });

  it('lists my exams and assignments', () => {
    controller.listMyExams(user);
    expect(academics.listMyExams).toHaveBeenCalledWith('user-1');
    controller.listMyAssignments(user);
    expect(academics.listMyAssignments).toHaveBeenCalledWith('user-1');
  });

  it('submits an assignment', () => {
    controller.submitAssignment(user, 'a-1', { content: 'x' } as never);
    expect(academics.submitAssignment).toHaveBeenCalledWith('user-1', 'a-1', { content: 'x' });
  });

  it('gets attendance, marks, GPA and CGPA', () => {
    controller.getMyAttendance(user);
    expect(academics.getMyAttendance).toHaveBeenCalledWith('user-1');
    controller.getMyMarks(user);
    expect(academics.getMyMarks).toHaveBeenCalledWith('user-1');
    controller.getMyGpa(user);
    expect(academics.getMyGpa).toHaveBeenCalledWith('user-1');
    controller.getMyCgpa(user);
    expect(academics.getMyCgpa).toHaveBeenCalledWith('user-1');
  });

  it('lists the academic calendar with query filters', () => {
    controller.listCalendarEvents({ page: 1, limit: 50 } as never);
    expect(academics.listCalendarEvents).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });
});
