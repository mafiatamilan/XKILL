import { CollegeAdminController } from './college-admin.controller';
import { CollegeAdminService } from './college-admin.service';

describe('CollegeAdminController', () => {
  const admin = {
    listDepartments: jest.fn(),
    createDepartment: jest.fn(),
    updateDepartment: jest.fn(),
    deleteDepartment: jest.fn(),
    createSemester: jest.fn(),
    listCourses: jest.fn(),
    createCourse: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    listUsersByRole: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    getAcademicReports: jest.fn(),
  };
  let controller: CollegeAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CollegeAdminController(admin as unknown as CollegeAdminService);
  });

  const user = { id: 'admin-1' } as never;

  it('handles department CRUD', () => {
    controller.listDepartments({ page: 1, limit: 20 } as never);
    expect(admin.listDepartments).toHaveBeenCalledWith(1, 20);
    controller.createDepartment(user, { name: 'CSE', code: 'CSE' } as never, '1.1.1.1');
    expect(admin.createDepartment).toHaveBeenCalledWith(
      'admin-1',
      { name: 'CSE', code: 'CSE' },
      '1.1.1.1',
    );
    controller.updateDepartment(user, 'd-1', { name: 'X' } as never, '1.1.1.1');
    expect(admin.updateDepartment).toHaveBeenCalledWith('admin-1', 'd-1', { name: 'X' }, '1.1.1.1');
    controller.deleteDepartment(user, 'd-1', '1.1.1.1');
    expect(admin.deleteDepartment).toHaveBeenCalledWith('admin-1', 'd-1', '1.1.1.1');
  });

  it('creates a semester', () => {
    controller.createSemester(user, { number: 3, name: 'Sem III' } as never, '1.1.1.1');
    expect(admin.createSemester).toHaveBeenCalledWith(
      'admin-1',
      { number: 3, name: 'Sem III' },
      '1.1.1.1',
    );
  });

  it('handles course CRUD', () => {
    controller.listCourses({ page: 1, limit: 20, search: 'alg' } as never);
    expect(admin.listCourses).toHaveBeenCalledWith({ search: 'alg', page: 1, limit: 20 });
    controller.createCourse(user, { code: 'CS301', name: 'DSA' } as never, '1.1.1.1');
    expect(admin.createCourse).toHaveBeenCalledWith(
      'admin-1',
      { code: 'CS301', name: 'DSA' },
      '1.1.1.1',
    );
    controller.updateCourse(user, 'c-1', { name: 'X' } as never, '1.1.1.1');
    expect(admin.updateCourse).toHaveBeenCalledWith('admin-1', 'c-1', { name: 'X' }, '1.1.1.1');
    controller.deleteCourse(user, 'c-1', '1.1.1.1');
    expect(admin.deleteCourse).toHaveBeenCalledWith('admin-1', 'c-1', '1.1.1.1');
  });

  it('manages faculty and student accounts', () => {
    controller.listFaculty({ page: 1, limit: 20 } as never);
    expect(admin.listUsersByRole).toHaveBeenCalledWith('faculty', {
      search: undefined,
      page: 1,
      limit: 20,
    });
    controller.createFaculty(
      user,
      { email: 'f@x.com', fullName: 'F', password: 'secret' } as never,
      '1.1.1.1',
    );
    expect(admin.createUser).toHaveBeenCalledWith(
      'admin-1',
      'faculty',
      { email: 'f@x.com', fullName: 'F', password: 'secret' },
      '1.1.1.1',
    );
    controller.updateFaculty(user, 'u-1', { fullName: 'F2' } as never, '1.1.1.1');
    expect(admin.updateUser).toHaveBeenCalledWith('admin-1', 'u-1', { fullName: 'F2' }, '1.1.1.1');
    controller.createStudent(
      user,
      { email: 's@x.com', fullName: 'S', password: 'secret' } as never,
      '1.1.1.1',
    );
    expect(admin.createUser).toHaveBeenCalledWith(
      'admin-1',
      'student',
      { email: 's@x.com', fullName: 'S', password: 'secret' },
      '1.1.1.1',
    );
    controller.updateStudent(user, 'u-2', { isActive: 0 } as never, '1.1.1.1');
    expect(admin.updateUser).toHaveBeenCalledWith('admin-1', 'u-2', { isActive: 0 }, '1.1.1.1');
  });

  it('gets academic reports', () => {
    controller.getAcademicReports({ department: 'd-1' } as never);
    expect(admin.getAcademicReports).toHaveBeenCalledWith({ department: 'd-1' });
  });
});
