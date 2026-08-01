import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AcademicsRepository } from './academics.repository';
import { CollegeAdminService } from './college-admin.service';

const department = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: 'CSE',
  code: 'CSE',
  ...overrides,
});

const subject = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  code: `CS${id}`,
  name: `Subject ${id}`,
  credit: 4,
  departmentId: 'd1',
  semesterId: 's3',
  facultyId: null,
  department: { id: 'd1', name: 'CSE', code: 'CSE' },
  semester: { id: 's3', number: 3, name: 'Sem III' },
  faculty: null,
  ...overrides,
});

describe('CollegeAdminService', () => {
  let service: CollegeAdminService;
  let repository: {
    listDepartments: jest.Mock;
    findDepartmentById: jest.Mock;
    findDepartmentByNameOrCode: jest.Mock;
    createDepartment: jest.Mock;
    updateDepartment: jest.Mock;
    deleteDepartment: jest.Mock;
    findSemesterByNumber: jest.Mock;
    createSemester: jest.Mock;
    countSubjects: jest.Mock;
    listSubjects: jest.Mock;
    findSubjectByCode: jest.Mock;
    findSubjectById: jest.Mock;
    createSubject: jest.Mock;
    updateSubject: jest.Mock;
    deleteSubject: jest.Mock;
    findSemesterById: jest.Mock;
    findUserById: jest.Mock;
    countUsersByRole: jest.Mock;
    listUsersByRole: jest.Mock;
    findUserByEmail: jest.Mock;
    findRoleByName: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    client: { attendanceRecord: { findMany: jest.Mock }; internalMark: { findMany: jest.Mock } };
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CollegeAdminService,
        {
          provide: AcademicsRepository,
          useValue: {
            listDepartments: jest.fn(),
            findDepartmentById: jest.fn(),
            findDepartmentByNameOrCode: jest.fn(),
            createDepartment: jest.fn(),
            updateDepartment: jest.fn(),
            deleteDepartment: jest.fn(),
            findSemesterByNumber: jest.fn(),
            createSemester: jest.fn(),
            countSubjects: jest.fn(),
            listSubjects: jest.fn(),
            findSubjectByCode: jest.fn(),
            findSubjectById: jest.fn(),
            createSubject: jest.fn(),
            updateSubject: jest.fn(),
            deleteSubject: jest.fn(),
            findSemesterById: jest.fn(),
            findUserById: jest.fn(),
            countUsersByRole: jest.fn(),
            listUsersByRole: jest.fn(),
            findUserByEmail: jest.fn(),
            findRoleByName: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
            client: {
              attendanceRecord: { findMany: jest.fn() },
              internalMark: { findMany: jest.fn() },
            },
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get(CollegeAdminService);
    repository = module.get(AcademicsRepository) as never;
    audit = module.get(AuditService) as never;
  });

  describe('departments', () => {
    it('lists departments with pagination', async () => {
      repository.listDepartments.mockResolvedValue([
        department('1'),
        department('2'),
        department('3'),
      ]);
      const result = (await service.listDepartments(1, 2)) as {
        data: unknown[];
        meta: { total: number };
      };
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(3);
    });

    it('creates a department and audits it', async () => {
      repository.findDepartmentByNameOrCode.mockResolvedValue(null);
      repository.createDepartment.mockResolvedValue(department('1'));
      const result = await service.createDepartment(
        'admin1',
        { name: 'CSE', code: 'CSE' },
        '1.2.3.4',
      );
      expect(result.id).toBe('1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.department.create' }),
      );
    });

    it('rejects a duplicate department', async () => {
      repository.findDepartmentByNameOrCode.mockResolvedValue(department('1'));
      await expect(
        service.createDepartment('admin1', { name: 'CSE', code: 'CSE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 404 updating an unknown department', async () => {
      repository.findDepartmentById.mockResolvedValue(null);
      await expect(service.updateDepartment('admin1', 'nope', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteDepartment('admin1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('semesters', () => {
    it('creates a semester', async () => {
      repository.findSemesterByNumber.mockResolvedValue(null);
      repository.createSemester.mockResolvedValue({ id: 's3', number: 3 });
      const result = await service.createSemester(
        'admin1',
        { number: 3, name: 'Sem III' },
        '1.2.3.4',
      );
      expect(result.number).toBe(3);
      expect(audit.record).toHaveBeenCalled();
    });

    it('rejects a duplicate semester number', async () => {
      repository.findSemesterByNumber.mockResolvedValue({ id: 's3' });
      await expect(
        service.createSemester('admin1', { number: 3, name: 'Sem III' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('courses', () => {
    it('lists courses with search', async () => {
      repository.countSubjects.mockResolvedValue(1);
      repository.listSubjects.mockResolvedValue([subject('1')]);
      const result = await service.listCourses({ search: 'alg', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(repository.listSubjects).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alg' }),
      );
    });

    it('creates a course with a validated faculty', async () => {
      repository.findSubjectByCode.mockResolvedValue(null);
      repository.findDepartmentById.mockResolvedValue(department('d1'));
      repository.findSemesterById.mockResolvedValue({ id: 's3' });
      repository.findUserById.mockResolvedValue({ id: 'f1', role: { name: 'faculty' } });
      repository.createSubject.mockResolvedValue(subject('1'));
      repository.findSubjectById.mockResolvedValue(subject('1'));
      const result = (await service.createCourse(
        'admin1',
        {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'd1',
          semesterId: 's3',
          facultyId: 'f1',
        },
        '1.2.3.4',
      )) as { id: string };
      expect(result.id).toBe('1');
      expect(audit.record).toHaveBeenCalled();
    });

    it('rejects a duplicate course code', async () => {
      repository.findSubjectByCode.mockResolvedValue(subject('1'));
      await expect(
        service.createCourse('admin1', {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'd1',
          semesterId: 's3',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a facultyId that is not a faculty account', async () => {
      repository.findSubjectByCode.mockResolvedValue(null);
      repository.findDepartmentById.mockResolvedValue(department('d1'));
      repository.findSemesterById.mockResolvedValue({ id: 's3' });
      repository.findUserById.mockResolvedValue({ id: 'u1', role: { name: 'student' } });
      await expect(
        service.createCourse('admin1', {
          code: 'CS301',
          name: 'DSA',
          departmentId: 'd1',
          semesterId: 's3',
          facultyId: 'u1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 updating/deleting an unknown course', async () => {
      repository.findSubjectById.mockResolvedValue(null);
      await expect(service.updateCourse('admin1', 'nope', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteCourse('admin1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('users (faculty/student)', () => {
    it('lists users by role', async () => {
      repository.countUsersByRole.mockResolvedValue(1);
      repository.listUsersByRole.mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.c',
          fullName: 'A',
          isActive: true,
          role: { name: 'faculty' },
          createdAt: new Date(),
        },
      ]);
      const result = await service.listUsersByRole('faculty', { page: 1, limit: 20 });
      expect(result.data[0]).toMatchObject({ id: 'u1', role: 'faculty' });
      expect(repository.countUsersByRole).toHaveBeenCalledWith({
        role: 'faculty',
        search: undefined,
      });
    });

    it('creates a user with a hashed password', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      repository.findRoleByName.mockResolvedValue({ id: 'rf' });
      repository.createUser.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        fullName: 'A',
        isActive: true,
      });
      const result = await service.createUser(
        'admin1',
        'faculty',
        { email: 'A@b.c', fullName: 'A', password: 'secret' },
        '1.2.3.4',
      );
      expect(result).toMatchObject({ id: 'u1', role: 'faculty' });
      const createCall = repository.createUser.mock.calls[0][0];
      expect(createCall.email).toBe('a@b.c');
      expect(createCall.passwordHash).not.toBe('secret');
      expect(await bcrypt.compare('secret', createCall.passwordHash)).toBe(true);
      expect(audit.record).toHaveBeenCalled();
    });

    it('rejects a duplicate email on create', async () => {
      repository.findUserByEmail.mockResolvedValue({ id: 'u1' });
      await expect(
        service.createUser('admin1', 'faculty', {
          email: 'a@b.c',
          fullName: 'A',
          password: 'secret',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates a user and normalizes isActive', async () => {
      repository.findUserById.mockResolvedValue({
        id: 'u1',
        fullName: 'A',
        isActive: true,
        role: { name: 'faculty' },
      });
      repository.updateUser.mockResolvedValue({
        id: 'u1',
        fullName: 'B',
        isActive: false,
        role: { name: 'faculty' },
      });
      const result = (await service.updateUser('admin1', 'u1', { isActive: 0 }, '1.2.3.4')) as {
        isActive: boolean;
      };
      expect(repository.updateUser).toHaveBeenCalledWith('u1', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('throws 404 updating an unknown user', async () => {
      repository.findUserById.mockResolvedValue(null);
      await expect(service.updateUser('admin1', 'nope', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('academic reports', () => {
    it('returns summary + per-department aggregates', async () => {
      repository.listDepartments.mockResolvedValue([department('d1'), department('d2')]);
      repository.listSubjects.mockResolvedValue([
        subject('1', { departmentId: 'd1' }),
        subject('2', { departmentId: 'd2' }),
      ]);
      repository.listUsersByRole.mockResolvedValue([
        { studentProfile: { department: 'CSE' } },
        { studentProfile: { department: 'ECE' } },
      ]);
      repository.client.attendanceRecord.findMany.mockResolvedValue([
        { subjectId: '1', status: 'present' },
        { subjectId: '1', status: 'absent' },
      ]);
      repository.client.internalMark.findMany.mockResolvedValue([
        { subjectId: '1', marksObtained: 80, maxMarks: 100 },
        { subjectId: '1', marksObtained: 40, maxMarks: 100 },
      ]);
      const result = await service.getAcademicReports({});
      expect(result.summary.departments).toBe(2);
      expect(result.summary.subjects).toBe(2);
      expect(result.byDepartment).toHaveLength(2);
      const cse = result.byDepartment.find((d) => d.departmentId === 'd1')!;
      expect(cse.attendancePercentage).toBe(50);
      expect(cse.averageMarkPercentage).toBe(60);
    });

    it('returns null percentages when there is no data', async () => {
      repository.listDepartments.mockResolvedValue([department('d1')]);
      repository.listSubjects.mockResolvedValue([]);
      repository.listUsersByRole.mockResolvedValue([]);
      repository.client.attendanceRecord.findMany.mockResolvedValue([]);
      repository.client.internalMark.findMany.mockResolvedValue([]);
      const result = await service.getAcademicReports({ department: 'd1' });
      expect(result.byDepartment[0].attendancePercentage).toBeNull();
      expect(result.byDepartment[0].averageMarkPercentage).toBeNull();
    });
  });
});
