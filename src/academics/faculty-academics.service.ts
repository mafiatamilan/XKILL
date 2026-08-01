import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { AcademicsRepository } from './academics.repository';
import { calculateAttendancePercentage } from './calculators/attendance-calculator';
import { calculateGpa } from './calculators/gpa-calculator';

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable()
export class FacultyAcademicsService {
  constructor(
    private readonly repository: AcademicsRepository,
    private readonly audit: AuditService,
  ) {}

  // ---- Subjects (scoped to the assigned faculty) ----

  async listMySubjects(
    facultyId: string,
    page: number,
    limit: number,
  ): Promise<ListResult<unknown>> {
    const [total, subjects] = await Promise.all([
      this.repository.countSubjects({}),
      this.repository.listSubjects({ skip: (page - 1) * limit, take: limit }),
    ]);
    const mine = subjects.filter((s) => s.faculty?.id === facultyId);
    return { data: mine, meta: buildPaginationMeta(total, page, limit) };
  }

  async getSubject(facultyId: string, subjectId: string) {
    const subject = await this.ensureOwnedSubject(facultyId, subjectId);
    return subject;
  }

  async createSubject(
    facultyId: string,
    dto: {
      code: string;
      name: string;
      description?: string;
      credit?: number;
      departmentId: string;
      semesterId: string;
    },
    ip?: string,
  ) {
    const existing = await this.repository.findSubjectByCode(dto.code);
    if (existing) {
      throw new BadRequestException({
        code: 'SUBJECT_CODE_EXISTS',
        message: `A subject with code '${dto.code}' already exists`,
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
    const subject = await this.repository.createSubject({
      ...dto,
      facultyId,
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.subject.create',
      entityType: 'subject',
      entityId: subject.id,
      after: { code: subject.code, name: subject.name },
      ip,
    });
    return this.repository.findSubjectById(subject.id);
  }

  async updateSubject(
    facultyId: string,
    subjectId: string,
    dto: Record<string, unknown>,
    ip?: string,
  ) {
    const before = await this.ensureOwnedSubject(facultyId, subjectId);
    const updated = await this.repository.updateSubject(subjectId, dto);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.subject.update',
      entityType: 'subject',
      entityId: subjectId,
      before: { name: before.name, credit: before.credit },
      after: { name: updated.name, credit: updated.credit },
      ip,
    });
    return this.repository.findSubjectById(subjectId);
  }

  async deleteSubject(facultyId: string, subjectId: string, ip?: string): Promise<void> {
    const before = await this.ensureOwnedSubject(facultyId, subjectId);
    await this.repository.deleteSubject(subjectId);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.subject.delete',
      entityType: 'subject',
      entityId: subjectId,
      before: { name: before.name, code: before.code },
      ip,
    });
  }

  // ---- Materials ----

  async listMaterials(facultyId: string, subjectId: string) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    return this.repository.listMaterials(subjectId);
  }

  async createMaterial(
    facultyId: string,
    subjectId: string,
    dto: {
      title: string;
      type: string;
      url: string;
    },
    ip?: string,
  ) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    const material = await this.repository.createMaterial({
      subjectId,
      title: dto.title,
      type: dto.type,
      url: dto.url,
      uploadedBy: facultyId,
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.material.create',
      entityType: 'material',
      entityId: material.id,
      after: { title: material.title, subjectId },
      ip,
    });
    return material;
  }

  async updateMaterial(
    facultyId: string,
    materialId: string,
    dto: Record<string, unknown>,
    ip?: string,
  ) {
    const material = await this.repository.findMaterialById(materialId);
    if (!material) {
      throw new NotFoundException({ code: 'MATERIAL_NOT_FOUND', message: 'Material not found' });
    }
    await this.ensureOwnedSubject(facultyId, material.subjectId);
    const updated = await this.repository.updateMaterial(materialId, dto);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.material.update',
      entityType: 'material',
      entityId: materialId,
      ip,
    });
    return updated;
  }

  async deleteMaterial(facultyId: string, materialId: string, ip?: string): Promise<void> {
    const material = await this.repository.findMaterialById(materialId);
    if (!material) {
      throw new NotFoundException({ code: 'MATERIAL_NOT_FOUND', message: 'Material not found' });
    }
    await this.ensureOwnedSubject(facultyId, material.subjectId);
    await this.repository.deleteMaterial(materialId);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.material.delete',
      entityType: 'material',
      entityId: materialId,
      ip,
    });
  }

  // ---- Attendance ----

  async markAttendance(
    facultyId: string,
    dto: {
      subjectId: string;
      sessionDate: string;
      records: Array<{ studentId: string; status: string }>;
    },
    ip?: string,
  ) {
    await this.ensureOwnedSubject(facultyId, dto.subjectId);
    if (dto.records.length === 0) {
      throw new BadRequestException({
        code: 'NO_RECORDS',
        message: 'At least one attendance record is required',
      });
    }
    const sessionDate = new Date(`${dto.sessionDate}T00:00:00.000Z`);
    const marked: Array<{ studentId: string; status: string }> = [];
    await this.repository.client.$transaction(async (tx) => {
      for (const record of dto.records) {
        const student = await tx.user.findFirst({
          where: { id: record.studentId, role: { name: 'student' } },
        });
        if (!student) {
          throw new BadRequestException({
            code: 'INVALID_STUDENT',
            message: `Student '${record.studentId}' does not exist or is not a student`,
          });
        }
        await this.repository.upsertAttendance(
          {
            subjectId: dto.subjectId,
            studentId: record.studentId,
            sessionDate,
            status: record.status,
            markedBy: facultyId,
          },
          tx,
        );
        marked.push({ studentId: record.studentId, status: record.status });
      }
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.attendance.mark',
      entityType: 'attendance',
      metadata: { subjectId: dto.subjectId, sessionDate: dto.sessionDate, count: marked.length },
      ip,
    });
    return {
      subjectId: dto.subjectId,
      sessionDate: dto.sessionDate,
      records: marked,
      count: marked.length,
    };
  }

  async getAttendance(facultyId: string, subjectId: string, sessionDate?: string) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    return this.repository.listAttendanceForSubject(subjectId, sessionDate);
  }

  // ---- Assignments ----

  async listAssignments(facultyId: string, subjectId: string) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    return this.repository.listAssignmentsForSubject(subjectId);
  }

  async createAssignment(
    facultyId: string,
    subjectId: string,
    dto: {
      title: string;
      description?: string;
      maxScore?: number;
      dueAt?: string;
    },
    ip?: string,
  ) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    const assignment = await this.repository.createAssignment({
      subjectId,
      title: dto.title,
      description: dto.description,
      maxScore: dto.maxScore,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.assignment.create',
      entityType: 'assignment',
      entityId: assignment.id,
      after: { title: assignment.title, subjectId },
      ip,
    });
    return this.repository.findAssignmentById(assignment.id);
  }

  async updateAssignment(
    facultyId: string,
    assignmentId: string,
    dto: Record<string, unknown>,
    ip?: string,
  ) {
    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found',
      });
    }
    await this.ensureOwnedSubject(facultyId, assignment.subjectId);
    await this.repository.updateAssignment(assignmentId, dto);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.assignment.update',
      entityType: 'assignment',
      entityId: assignmentId,
      ip,
    });
    return this.repository.findAssignmentById(assignmentId);
  }

  async deleteAssignment(facultyId: string, assignmentId: string, ip?: string): Promise<void> {
    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found',
      });
    }
    await this.ensureOwnedSubject(facultyId, assignment.subjectId);
    await this.repository.deleteAssignment(assignmentId);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.assignment.delete',
      entityType: 'assignment',
      entityId: assignmentId,
      ip,
    });
  }

  // ---- Exams ----

  async listExams(facultyId: string, subjectId: string) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    return this.repository.listExamsForSubject(subjectId);
  }

  async createExam(
    facultyId: string,
    subjectId: string,
    dto: {
      title: string;
      examType?: string;
      maxMarks?: number;
      scheduledAt?: string;
    },
    ip?: string,
  ) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    const exam = await this.repository.createExam({
      subjectId,
      title: dto.title,
      examType: dto.examType,
      maxMarks: dto.maxMarks,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.exam.create',
      entityType: 'exam',
      entityId: exam.id,
      after: { title: exam.title, subjectId },
      ip,
    });
    return this.repository.findExamById(exam.id);
  }

  async updateExam(facultyId: string, examId: string, dto: Record<string, unknown>, ip?: string) {
    const exam = await this.repository.findExamById(examId);
    if (!exam) {
      throw new NotFoundException({ code: 'EXAM_NOT_FOUND', message: 'Exam not found' });
    }
    await this.ensureOwnedSubject(facultyId, exam.subjectId);
    await this.repository.updateExam(examId, dto);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.exam.update',
      entityType: 'exam',
      entityId: examId,
      ip,
    });
    return this.repository.findExamById(examId);
  }

  async deleteExam(facultyId: string, examId: string, ip?: string): Promise<void> {
    const exam = await this.repository.findExamById(examId);
    if (!exam) {
      throw new NotFoundException({ code: 'EXAM_NOT_FOUND', message: 'Exam not found' });
    }
    await this.ensureOwnedSubject(facultyId, exam.subjectId);
    await this.repository.deleteExam(examId);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.exam.delete',
      entityType: 'exam',
      entityId: examId,
      ip,
    });
  }

  // ---- Bulk marks entry (transactional) ----

  async enterBulkMarks(
    facultyId: string,
    examId: string,
    dto: {
      marks: Array<{ studentId: string; marksObtained: number }>;
    },
    ip?: string,
  ) {
    const exam = await this.repository.findExamById(examId);
    if (!exam) {
      throw new NotFoundException({ code: 'EXAM_NOT_FOUND', message: 'Exam not found' });
    }
    await this.ensureOwnedSubject(facultyId, exam.subjectId);
    if (dto.marks.length === 0) {
      throw new BadRequestException({
        code: 'NO_MARKS',
        message: 'At least one mark row is required',
      });
    }

    const saved: Array<{ studentId: string; marksObtained: number }> = [];
    await this.repository.client.$transaction(async (tx) => {
      for (const row of dto.marks) {
        if (row.marksObtained > exam.maxMarks) {
          throw new BadRequestException({
            code: 'MARKS_EXCEED_MAX',
            message: `marksObtained (${row.marksObtained}) exceeds exam max (${exam.maxMarks}) for student '${row.studentId}'`,
          });
        }
        const student = await tx.user.findFirst({
          where: { id: row.studentId, role: { name: 'student' } },
        });
        if (!student) {
          throw new BadRequestException({
            code: 'INVALID_STUDENT',
            message: `Student '${row.studentId}' does not exist or is not a student`,
          });
        }
        await this.repository.createMarksBulk(
          [
            {
              subjectId: exam.subjectId,
              examId,
              studentId: row.studentId,
              marksObtained: row.marksObtained,
              maxMarks: exam.maxMarks,
              attempt: 1,
            },
          ],
          tx,
        );
        saved.push({ studentId: row.studentId, marksObtained: row.marksObtained });
      }
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.exam.marks.enter',
      entityType: 'mark',
      entityId: examId,
      metadata: { subjectId: exam.subjectId, count: saved.length },
      ip,
    });
    return { examId, subjectId: exam.subjectId, count: saved.length, marks: saved };
  }

  async getExamMarks(facultyId: string, examId: string) {
    const exam = await this.repository.findExamById(examId);
    if (!exam) {
      throw new NotFoundException({ code: 'EXAM_NOT_FOUND', message: 'Exam not found' });
    }
    await this.ensureOwnedSubject(facultyId, exam.subjectId);
    return this.repository.listMarksForExam(examId);
  }

  // ---- Student analytics ----

  async getStudentAnalytics(facultyId: string, studentId: string) {
    const student = await this.repository.findUserById(studentId);
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found' });
    }
    const mySubjects = await this.repository.listSubjects({ take: 1000 });
    const mySubjectIds = mySubjects.filter((s) => s.faculty?.id === facultyId).map((s) => s.id);
    if (mySubjectIds.length === 0) {
      throw new ForbiddenException({
        code: 'NO_ACCESS',
        message: 'Faculty has no subjects assigned to view analytics for this student',
      });
    }
    const [attendance, marks] = await Promise.all([
      this.repository.listAttendanceForStudent(studentId, mySubjectIds),
      this.repository.listMarksForStudent(studentId, mySubjectIds),
    ]);
    const subjectMap = new Map(
      mySubjects
        .filter((s) => s.faculty?.id === facultyId)
        .map((s) => [s.id, { credit: s.credit, code: s.code, name: s.name }]),
    );
    const attendancePercentage = calculateAttendancePercentage(
      attendance.map((a) => ({ status: a.status as never })),
    );
    const gpa = calculateGpa(
      marks.map((m) => ({
        subjectId: m.subjectId,
        credit: subjectMap.get(m.subjectId)?.credit ?? m.subject.credit,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        attempt: m.attempt,
      })),
    );
    return {
      studentId: student.id,
      studentName: student.fullName,
      attendancePercentage,
      totalSessions: attendance.length,
      attendedSessions: attendance.filter((a) => ['present', 'late'].includes(a.status)).length,
      gpa: gpa.gpa,
      totalCredits: gpa.totalCredits,
      passedCredits: gpa.passedCredits,
      marks: marks.map((m) => ({
        id: m.id,
        subjectId: m.subjectId,
        subject: m.subject,
        examId: m.examId ?? undefined,
        exam: m.exam ?? undefined,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        attempt: m.attempt,
      })),
    };
  }

  // ---- Question bank ----

  async listQuestions(facultyId: string, subjectId: string) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    return this.repository.listQuestionBank(subjectId);
  }

  async createQuestion(
    facultyId: string,
    subjectId: string,
    dto: {
      question: string;
      options?: unknown;
      correctAnswer?: string;
      difficulty?: string;
      marks?: number;
    },
    ip?: string,
  ) {
    await this.ensureOwnedSubject(facultyId, subjectId);
    const question = await this.repository.createQuestion({
      subjectId,
      question: dto.question,
      options: dto.options as never,
      correctAnswer: dto.correctAnswer,
      difficulty: dto.difficulty,
      marks: dto.marks,
      createdBy: facultyId,
    });
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.question.create',
      entityType: 'question',
      entityId: question.id,
      ip,
    });
    return question;
  }

  async updateQuestion(
    facultyId: string,
    questionId: string,
    dto: Record<string, unknown>,
    ip?: string,
  ) {
    const question = await this.repository.findQuestionById(questionId);
    if (!question) {
      throw new NotFoundException({ code: 'QUESTION_NOT_FOUND', message: 'Question not found' });
    }
    await this.ensureOwnedSubject(facultyId, question.subjectId);
    const updated = await this.repository.updateQuestion(questionId, dto);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.question.update',
      entityType: 'question',
      entityId: questionId,
      ip,
    });
    return updated;
  }

  async deleteQuestion(facultyId: string, questionId: string, ip?: string): Promise<void> {
    const question = await this.repository.findQuestionById(questionId);
    if (!question) {
      throw new NotFoundException({ code: 'QUESTION_NOT_FOUND', message: 'Question not found' });
    }
    await this.ensureOwnedSubject(facultyId, question.subjectId);
    await this.repository.deleteQuestion(questionId);
    await this.audit.record({
      userId: facultyId,
      action: 'faculty.question.delete',
      entityType: 'question',
      entityId: questionId,
      ip,
    });
  }

  // ---- helpers ----

  private async ensureOwnedSubject(facultyId: string, subjectId: string) {
    const subject = await this.repository.findSubjectByFacultyAndId(subjectId, facultyId);
    if (!subject) {
      const exists = await this.repository.findSubjectById(subjectId);
      if (!exists) {
        throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Subject not found' });
      }
      throw new ForbiddenException({
        code: 'SUBJECT_NOT_ASSIGNED',
        message: 'You are not assigned to teach this subject',
      });
    }
    return subject;
  }
}
