import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { AcademicsRepository } from './academics.repository';

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable()
export class CollegeAdminService {
  constructor(
    private readonly repository: AcademicsRepository,
    private readonly audit: AuditService,
  ) {}

  // ---- Departments ----

  async listDepartments(page: number, limit: number): Promise<ListResult<unknown>> {
    const departments = await this.repository.listDepartments();
    const total = departments.length;
    const start = (page - 1) * limit;
    return {
      data: departments.slice(start, start + limit),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createDepartment(
    adminId: string,
    dto: { name: string; code: string; description?: string },
    ip?: string,
  ) {
    const existing = await this.repository.findDepartmentByNameOrCode(dto.name, dto.code);
    if (existing) {
      throw new ConflictException({
        code: 'DEPARTMENT_EXISTS',
        message: 'A department with this name or code already exists',
      });
    }
    const department = await this.repository.createDepartment(dto);
    await this.audit.record({
      userId: adminId,
      action: 'admin.department.create',
      entityType: 'department',
      entityId: department.id,
      after: { name: department.name, code: department.code },
      ip,
    });
    return department;
  }

  async updateDepartment(adminId: string, id: string, dto: Record<string, unknown>, ip?: string) {
    const before = await this.requireDepartment(id);
    const updated = await this.repository.updateDepartment(id, dto);
    await this.audit.record({
      userId: adminId,
      action: 'admin.department.update',
      entityType: 'department',
      entityId: id,
      before: { name: before.name },
      after: { name: updated.name },
      ip,
    });
    return updated;
  }

  async deleteDepartment(adminId: string, id: string, ip?: string): Promise<void> {
    const before = await this.requireDepartment(id);
    await this.repository.deleteDepartment(id);
    await this.audit.record({
      userId: adminId,
      action: 'admin.department.delete',
      entityType: 'department',
      entityId: id,
      before: { name: before.name },
      ip,
    });
  }

  // ---- Semesters ----

  async createSemester(
    adminId: string,
    dto: { number: number; name: string; scheme?: string },
    ip?: string,
  ) {
    const existing = await this.repository.findSemesterByNumber(dto.number);
    if (existing) {
      throw new ConflictException({
        code: 'SEMESTER_EXISTS',
        message: `Semester ${dto.number} already exists`,
      });
    }
    const semester = await this.repository.createSemester(dto);
    await this.audit.record({
      userId: adminId,
      action: 'admin.semester.create',
      entityType: 'semester',
      entityId: semester.id,
      after: { number: semester.number, name: semester.name },
      ip,
    });
    return semester;
  }

  // ---- Courses (subjects) ----

  async listCourses(params: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<ListResult<unknown>> {
    const [total, courses] = await Promise.all([
      this.repository.countSubjects({ search: params.search }),
      this.repository.listSubjects({
        search: params.search,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);
    return {
      data: courses,
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  }

  async createCourse(
    adminId: string,
    dto: {
      code: string;
      name: string;
      description?: string;
      credit?: number;
      departmentId: string;
      semesterId: string;
      facultyId?: string;
    },
    ip?: string,
  ) {
    const existing = await this.repository.findSubjectByCode(dto.code);
    if (existing) {
      throw new ConflictException({
        code: 'COURSE_CODE_EXISTS',
        message: `A course with code '${dto.code}' already exists`,
      });
    }
    const department = await this.repository.findDepartmentById(dto.departmentId);
    if (!department) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
    const semester = await this.repository.findSemesterById(dto.semesterId);
    if (!semester) {
      throw new NotFoundException({ code: 'SEMESTER_NOT_FOUND', message: 'Semester not found' });
    }
    if (dto.facultyId) {
      const faculty = await this.repository.findUserById(dto.facultyId);
      if (!faculty || faculty.role.name !== 'faculty') {
        throw new BadRequestException({
          code: 'INVALID_FACULTY',
          message: 'facultyId must reference an existing faculty account',
        });
      }
    }
    const course = await this.repository.createSubject({
      ...dto,
      facultyId: dto.facultyId ?? undefined,
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.course.create',
      entityType: 'subject',
      entityId: course.id,
      after: { code: course.code, name: course.name },
      ip,
    });
    return this.repository.findSubjectById(course.id);
  }

  async updateCourse(adminId: string, id: string, dto: Record<string, unknown>, ip?: string) {
    const before = await this.repository.findSubjectById(id);
    if (!before) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }
    const updated = await this.repository.updateSubject(id, dto);
    await this.audit.record({
      userId: adminId,
      action: 'admin.course.update',
      entityType: 'subject',
      entityId: id,
      before: { name: before.name },
      after: { name: updated.name },
      ip,
    });
    return this.repository.findSubjectById(id);
  }

  async deleteCourse(adminId: string, id: string, ip?: string): Promise<void> {
    const before = await this.repository.findSubjectById(id);
    if (!before) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }
    await this.repository.deleteSubject(id);
    await this.audit.record({
      userId: adminId,
      action: 'admin.course.delete',
      entityType: 'subject',
      entityId: id,
      before: { name: before.name },
      ip,
    });
  }

  // ---- Faculty / student accounts ----

  async listUsersByRole(
    role: string,
    params: { search?: string; page: number; limit: number },
  ): Promise<ListResult<unknown>> {
    const [total, users] = await Promise.all([
      this.repository.countUsersByRole({ role, search: params.search }),
      this.repository.listUsersByRole({
        role,
        search: params.search,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);
    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        isActive: u.isActive,
        role: u.role.name,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  }

  async createUser(
    adminId: string,
    role: 'faculty' | 'student',
    dto: { email: string; fullName: string; password: string },
    ip?: string,
  ): Promise<unknown> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      });
    }
    const roleRecord = await this.repository.findRoleByName(role);
    if (!roleRecord) {
      throw new Error(`Role '${role}' is not seeded`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.repository.createUser({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
      roleId: roleRecord.id,
    });
    await this.audit.record({
      userId: adminId,
      action: `admin.${role}.create`,
      entityType: 'user',
      entityId: user.id,
      after: { email: user.email, role },
      ip,
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
      isActive: user.isActive,
    };
  }

  async updateUser(
    adminId: string,
    id: string,
    dto: { fullName?: string; isActive?: 0 | 1 },
    ip?: string,
  ): Promise<unknown> {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const updated = await this.repository.updateUser(id, {
      fullName: dto.fullName,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive === 1 } : {}),
    });
    await this.audit.record({
      userId: adminId,
      action: 'admin.user.update',
      entityType: 'user',
      entityId: id,
      before: { fullName: user.fullName, isActive: user.isActive },
      after: { fullName: updated.fullName, isActive: updated.isActive },
      ip,
    });
    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      isActive: updated.isActive,
      role: updated.role.name,
    };
  }

  // ---- Academic reports ----

  async getAcademicReports(query: { department?: string; semester?: string }) {
    const where = {
      departmentId: query.department,
      semesterId: query.semester,
    };
    const [departments, subjects, students, attendance, marks] = await Promise.all([
      this.repository.listDepartments(),
      this.repository.listSubjects({ ...where, take: 1000 }),
      this.repository.listUsersByRole({ role: 'student', take: 1000 }),
      this.repository.client.attendanceRecord.findMany({
        where: query.department ? { subject: { departmentId: query.department } } : {},
      }),
      this.repository.client.internalMark.findMany({
        where: query.department ? { subject: { departmentId: query.department } } : {},
        include: { subject: { select: { credit: true, departmentId: true } } },
      }),
    ]);

    const byDepartment = departments.map((dept) => {
      const deptSubjects = subjects.filter((s) => s.departmentId === dept.id);
      const subjectIds = new Set(deptSubjects.map((s) => s.id));
      const deptAttendance = attendance.filter((a) => subjectIds.has(a.subjectId));
      const deptMarks = marks.filter((m) => subjectIds.has(m.subjectId));
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        subjectCount: deptSubjects.length,
        studentCount: students.filter((s) => s.studentProfile?.department === dept.name).length,
        attendanceRecordCount: deptAttendance.length,
        attendancePercentage:
          deptAttendance.length > 0
            ? Math.round(
                (deptAttendance.filter((a) => ['present', 'late'].includes(a.status)).length /
                  deptAttendance.length) *
                  100,
              )
            : null,
        averageMarkPercentage:
          deptMarks.length > 0
            ? Math.round(
                deptMarks.reduce((sum, m) => sum + (m.marksObtained / m.maxMarks) * 100, 0) /
                  deptMarks.length,
              )
            : null,
      };
    });

    return {
      summary: {
        departments: departments.length,
        subjects: subjects.length,
        students: students.length,
        attendanceRecords: attendance.length,
        markRows: marks.length,
      },
      byDepartment,
    };
  }

  private async requireDepartment(id: string) {
    const department = await this.repository.findDepartmentById(id);
    if (!department) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
    return department;
  }
}
