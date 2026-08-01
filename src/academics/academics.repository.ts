import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type TxClient = Prisma.TransactionClient;

@Injectable()
export class AcademicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Exposes the raw Prisma client for transaction boundaries in services. */
  get client(): PrismaService {
    return this.prisma;
  }

  // ---- Departments & Semesters ----

  listDepartments() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  countDepartments(): Promise<number> {
    return this.prisma.department.count();
  }

  findDepartmentById(id: string) {
    return this.prisma.department.findUnique({ where: { id } });
  }

  findDepartmentByNameOrCode(name: string, code: string) {
    return this.prisma.department.findFirst({
      where: { OR: [{ name }, { code }] },
    });
  }

  createDepartment(data: { name: string; code: string; description?: string }) {
    return this.prisma.department.create({
      data: { name: data.name, code: data.code, description: data.description ?? null },
    });
  }

  updateDepartment(id: string, data: { name?: string; code?: string; description?: string }) {
    return this.prisma.department.update({ where: { id }, data });
  }

  deleteDepartment(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }

  listSemesters() {
    return this.prisma.semester.findMany({ orderBy: { number: 'asc' } });
  }

  findSemesterById(id: string) {
    return this.prisma.semester.findUnique({ where: { id } });
  }

  findSemesterByNumber(number: number) {
    return this.prisma.semester.findUnique({ where: { number } });
  }

  createSemester(data: { number: number; name: string; scheme?: string }) {
    return this.prisma.semester.create({
      data: { number: data.number, name: data.name, scheme: data.scheme ?? null },
    });
  }

  // ---- Subjects ----

  listSubjects(params: {
    departmentId?: string;
    semesterId?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.SubjectWhereInput = {
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      ...(params.semesterId ? { semesterId: params.semesterId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.subject.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        semester: { select: { id: true, number: true, name: true } },
        faculty: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { name: 'asc' },
      skip: params.skip ?? 0,
      take: params.take ?? 20,
    });
  }

  countSubjects(params: { departmentId?: string; semesterId?: string; search?: string }) {
    const where: Prisma.SubjectWhereInput = {
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      ...(params.semesterId ? { semesterId: params.semesterId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.subject.count({ where });
  }

  findSubjectById(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        semester: { select: { id: true, number: true, name: true } },
        faculty: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  findSubjectByCode(code: string) {
    return this.prisma.subject.findUnique({ where: { code } });
  }

  findSubjectByFacultyAndId(id: string, facultyId: string) {
    return this.prisma.subject.findFirst({ where: { id, facultyId } });
  }

  createSubject(data: {
    code: string;
    name: string;
    description?: string;
    credit?: number;
    departmentId: string;
    semesterId: string;
    facultyId?: string;
  }) {
    return this.prisma.subject.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        credit: data.credit ?? 4,
        departmentId: data.departmentId,
        semesterId: data.semesterId,
        facultyId: data.facultyId ?? null,
      },
    });
  }

  updateSubject(
    id: string,
    data: {
      code?: string;
      name?: string;
      description?: string;
      credit?: number;
      departmentId?: string;
      semesterId?: string;
      facultyId?: string;
    },
  ) {
    return this.prisma.subject.update({ where: { id }, data });
  }

  deleteSubject(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }

  // ---- Materials ----

  listMaterials(subjectId: string) {
    return this.prisma.studyMaterial.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMaterialById(id: string) {
    return this.prisma.studyMaterial.findUnique({ where: { id } });
  }

  createMaterial(data: {
    subjectId: string;
    title: string;
    type: string;
    url: string;
    uploadedBy?: string;
  }) {
    return this.prisma.studyMaterial.create({
      data: {
        subjectId: data.subjectId,
        title: data.title,
        type: data.type,
        url: data.url,
        uploadedBy: data.uploadedBy ?? null,
      },
    });
  }

  updateMaterial(id: string, data: { title?: string; type?: string; url?: string }) {
    return this.prisma.studyMaterial.update({ where: { id }, data });
  }

  deleteMaterial(id: string) {
    return this.prisma.studyMaterial.delete({ where: { id } });
  }

  // ---- Timetable ----

  listTimetable(subjectId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { subjectId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  // ---- Exams ----

  listExams(subjectIds: string[]) {
    return this.prisma.exam.findMany({
      where: { subjectId: { in: subjectIds } },
      include: {
        subject: {
          select: { id: true, code: true, name: true, departmentId: true, semesterId: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  listExamsForSubject(subjectId: string) {
    return this.prisma.exam.findMany({
      where: { subjectId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  findExamById(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: { subject: { select: { id: true, code: true, name: true, facultyId: true } } },
    });
  }

  createExam(data: {
    subjectId: string;
    title: string;
    examType?: string;
    maxMarks?: number;
    scheduledAt?: Date | null;
  }) {
    return this.prisma.exam.create({
      data: {
        subjectId: data.subjectId,
        title: data.title,
        examType: data.examType ?? 'internal',
        maxMarks: data.maxMarks ?? 100,
        scheduledAt: data.scheduledAt ?? null,
      },
    });
  }

  updateExam(
    id: string,
    data: { title?: string; examType?: string; maxMarks?: number; scheduledAt?: Date | null },
  ) {
    return this.prisma.exam.update({ where: { id }, data });
  }

  deleteExam(id: string) {
    return this.prisma.exam.delete({ where: { id } });
  }

  // ---- Assignments ----

  listAssignments(subjectIds: string[]) {
    return this.prisma.assignment.findMany({
      where: { subjectId: { in: subjectIds } },
      include: {
        subject: {
          select: { id: true, code: true, name: true, departmentId: true, semesterId: true },
        },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  listAssignmentsForSubject(subjectId: string) {
    return this.prisma.assignment.findMany({
      where: { subjectId },
      include: { subject: { select: { id: true, code: true, name: true } } },
      orderBy: { dueAt: 'asc' },
    });
  }

  findAssignmentById(id: string) {
    return this.prisma.assignment.findUnique({
      where: { id },
      include: { subject: { select: { id: true, code: true, name: true, facultyId: true } } },
    });
  }

  createAssignment(data: {
    subjectId: string;
    title: string;
    description?: string;
    maxScore?: number;
    dueAt?: Date | null;
  }) {
    return this.prisma.assignment.create({
      data: {
        subjectId: data.subjectId,
        title: data.title,
        description: data.description ?? null,
        maxScore: data.maxScore ?? null,
        dueAt: data.dueAt ?? null,
      },
    });
  }

  updateAssignment(
    id: string,
    data: { title?: string; description?: string; maxScore?: number; dueAt?: Date | null },
  ) {
    return this.prisma.assignment.update({ where: { id }, data });
  }

  deleteAssignment(id: string) {
    return this.prisma.assignment.delete({ where: { id } });
  }

  // ---- Submissions ----

  findSubmission(assignmentId: string, studentId: string) {
    return this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
  }

  listSubmissionsForAssignments(assignmentIds: string[], studentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: { in: assignmentIds }, studentId },
    });
  }

  upsertSubmission(data: {
    assignmentId: string;
    studentId: string;
    content?: string;
    attachmentUrl?: string;
  }) {
    return this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: data.assignmentId, studentId: data.studentId },
      },
      update: {
        content: data.content ?? undefined,
        attachmentUrl: data.attachmentUrl ?? undefined,
        status: 'submitted',
      },
      create: {
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        content: data.content ?? null,
        attachmentUrl: data.attachmentUrl ?? null,
      },
    });
  }

  // ---- Attendance ----

  listAttendanceForStudent(studentId: string, subjectIds?: string[]) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...(subjectIds && subjectIds.length > 0 ? { subjectId: { in: subjectIds } } : {}),
      },
      include: {
        subject: {
          select: { id: true, code: true, name: true, departmentId: true, semesterId: true },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  listAttendanceForSubject(subjectId: string, sessionDate?: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { subjectId, ...(sessionDate ? { sessionDate: new Date(sessionDate) } : {}) },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  findAttendance(subjectId: string, studentId: string, sessionDate: Date) {
    return this.prisma.attendanceRecord.findUnique({
      where: {
        subjectId_studentId_sessionDate: { subjectId, studentId, sessionDate },
      },
    });
  }

  upsertAttendance(
    data: {
      subjectId: string;
      studentId: string;
      sessionDate: Date;
      status: string;
      markedBy: string;
    },
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.attendanceRecord.upsert({
      where: {
        subjectId_studentId_sessionDate: {
          subjectId: data.subjectId,
          studentId: data.studentId,
          sessionDate: data.sessionDate,
        },
      },
      update: { status: data.status, markedBy: data.markedBy },
      create: {
        subjectId: data.subjectId,
        studentId: data.studentId,
        sessionDate: data.sessionDate,
        status: data.status,
        markedBy: data.markedBy,
      },
    });
  }

  countAttendanceForSubject(subjectId: string): Promise<number> {
    return this.prisma.attendanceRecord.count({ where: { subjectId } });
  }

  // ---- Internal marks ----

  listMarksForStudent(studentId: string, subjectIds?: string[]) {
    return this.prisma.internalMark.findMany({
      where: {
        studentId,
        ...(subjectIds && subjectIds.length > 0 ? { subjectId: { in: subjectIds } } : {}),
      },
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            credit: true,
            departmentId: true,
            semesterId: true,
          },
        },
        exam: { select: { id: true, title: true, examType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  listMarksForExam(examId: string) {
    return this.prisma.internalMark.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { studentId: 'asc' },
    });
  }

  findMark(subjectId: string, studentId: string, examId?: string) {
    return this.prisma.internalMark.findFirst({
      where: { subjectId, studentId, ...(examId ? { examId } : {}) },
    });
  }

  async createMarksBulk(
    rows: Array<{
      subjectId: string;
      examId: string;
      studentId: string;
      marksObtained: number;
      maxMarks: number;
      attempt?: number;
    }>,
    tx?: TxClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    for (const row of rows) {
      const existing = await client.internalMark.findFirst({
        where: { subjectId: row.subjectId, studentId: row.studentId, examId: row.examId },
      });
      if (existing) {
        await client.internalMark.update({
          where: { id: existing.id },
          data: {
            marksObtained: row.marksObtained,
            maxMarks: row.maxMarks,
            attempt: row.attempt ?? 1,
          },
        });
      } else {
        await client.internalMark.create({
          data: {
            subjectId: row.subjectId,
            examId: row.examId,
            studentId: row.studentId,
            marksObtained: row.marksObtained,
            maxMarks: row.maxMarks,
            attempt: row.attempt ?? 1,
          },
        });
      }
    }
  }

  deleteMarksForExam(examId: string) {
    return this.prisma.internalMark.deleteMany({ where: { examId } });
  }

  // ---- Student academic context ----

  findProfileByUserId(userId: string) {
    return this.prisma.studentProfile.findUnique({ where: { userId } });
  }

  // ---- Academic calendar ----

  listCalendarEvents(params: {
    from?: Date;
    to?: Date;
    eventType?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.AcademicCalendarEventWhereInput = {
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.from || params.to
        ? {
            startAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.academicCalendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    });
  }

  countCalendarEvents(params: { from?: Date; to?: Date; eventType?: string }) {
    const where: Prisma.AcademicCalendarEventWhereInput = {
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.from || params.to
        ? {
            startAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.academicCalendarEvent.count({ where });
  }

  findCalendarEventById(id: string) {
    return this.prisma.academicCalendarEvent.findUnique({ where: { id } });
  }

  createCalendarEvent(data: {
    title: string;
    description?: string;
    eventType?: string;
    startAt: Date;
    endAt?: Date | null;
    allDay?: boolean;
  }) {
    return this.prisma.academicCalendarEvent.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        eventType: data.eventType ?? 'academic',
        startAt: data.startAt,
        endAt: data.endAt ?? null,
        allDay: data.allDay ?? false,
      },
    });
  }

  updateCalendarEvent(id: string, data: Record<string, unknown>) {
    return this.prisma.academicCalendarEvent.update({ where: { id }, data });
  }

  deleteCalendarEvent(id: string) {
    return this.prisma.academicCalendarEvent.delete({ where: { id } });
  }

  // ---- Question bank ----

  listQuestionBank(subjectId: string) {
    return this.prisma.questionBankItem.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findQuestionById(id: string) {
    return this.prisma.questionBankItem.findUnique({ where: { id } });
  }

  createQuestion(data: {
    subjectId: string;
    question: string;
    options?: Prisma.InputJsonValue;
    correctAnswer?: string;
    difficulty?: string;
    marks?: number;
    createdBy?: string;
  }) {
    return this.prisma.questionBankItem.create({
      data: {
        subjectId: data.subjectId,
        question: data.question,
        options: data.options ?? Prisma.JsonNull,
        correctAnswer: data.correctAnswer ?? null,
        difficulty: data.difficulty ?? 'medium',
        marks: data.marks ?? null,
        createdBy: data.createdBy ?? null,
      },
    });
  }

  updateQuestion(id: string, data: Record<string, unknown>) {
    return this.prisma.questionBankItem.update({ where: { id }, data });
  }

  deleteQuestion(id: string) {
    return this.prisma.questionBankItem.delete({ where: { id } });
  }

  // ---- Users (admin) ----

  listUsersByRole(params: { role: string; search?: string; skip?: number; take?: number }) {
    return this.prisma.user.findMany({
      where: {
        role: { name: params.role },
        deletedAt: null,
        ...(params.search
          ? {
              OR: [
                { fullName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { role: { select: { id: true, name: true } }, studentProfile: true },
      orderBy: { createdAt: 'desc' },
      skip: params.skip ?? 0,
      take: params.take ?? 20,
    });
  }

  countUsersByRole(params: { role: string; search?: string }) {
    return this.prisma.user.count({
      where: {
        role: { name: params.role },
        deletedAt: null,
        ...(params.search
          ? {
              OR: [
                { fullName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } }, studentProfile: true },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } });
  }

  createUser(data: { email: string; passwordHash: string; fullName: string; roleId: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        roleId: data.roleId,
        emailVerifiedAt: new Date(),
      },
    });
  }

  updateUser(id: string, data: { fullName?: string; isActive?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true } } },
    });
  }
}
