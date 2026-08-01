import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { AcademicsRepository } from './academics.repository';
import { calculateAttendancePercentage } from './calculators/attendance-calculator';
import { calculateCgpa, calculateGpa } from './calculators/gpa-calculator';
import {
  AttendanceSummaryDto,
  CgpaResponseDto,
  GpaResponseDto,
  SubjectResponseDto,
} from './dto/academics.dto';

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable()
export class AcademicsService {
  constructor(private readonly repository: AcademicsRepository) {}

  // ---- Reference data ----

  async listDepartments() {
    return this.repository.listDepartments();
  }

  async listSemesters() {
    return this.repository.listSemesters();
  }

  // ---- Subjects ----

  async listSubjects(query: {
    department?: string;
    semester?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<ListResult<SubjectResponseDto>> {
    const where = {
      departmentId: query.department,
      semesterId: query.semester,
      search: query.search,
    };
    const [total, subjects] = await Promise.all([
      this.repository.countSubjects(where),
      this.repository.listSubjects({
        ...where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data: subjects.map((s) => this.toSubjectResponse(s)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getSubjectMaterials(subjectId: string) {
    await this.ensureSubject(subjectId);
    return this.repository.listMaterials(subjectId);
  }

  async getSubjectTimetable(subjectId: string) {
    await this.ensureSubject(subjectId);
    return this.repository.listTimetable(subjectId);
  }

  // ---- Exams / Assignments (me) ----

  async listMyExams(userId: string) {
    const context = await this.studentContext(userId);
    const subjects = await this.repository.listSubjects({
      departmentId: context?.departmentId,
      semesterId: context?.semesterId,
      take: 500,
    });
    const subjectIds = subjects.map((s) => s.id);
    if (subjectIds.length === 0) {
      return [];
    }
    const exams = await this.repository.listExams(subjectIds);
    return exams.map((e) => ({
      id: e.id,
      title: e.title,
      examType: e.examType,
      maxMarks: e.maxMarks,
      scheduledAt: e.scheduledAt ? e.scheduledAt.toISOString() : undefined,
      subjectId: e.subjectId,
      subject: e.subject,
    }));
  }

  async listMyAssignments(userId: string) {
    const context = await this.studentContext(userId);
    const subjects = await this.repository.listSubjects({
      departmentId: context?.departmentId,
      semesterId: context?.semesterId,
      take: 500,
    });
    const subjectIds = subjects.map((s) => s.id);
    if (subjectIds.length === 0) {
      return [];
    }
    const assignments = await this.repository.listAssignments(subjectIds);
    const submissionMap = new Map(
      (
        await this.repository.listSubmissionsForAssignments(
          assignments.map((a) => a.id),
          userId,
        )
      ).map((sub) => [sub.assignmentId, sub]),
    );
    return assignments.map((a) => {
      const submission = submissionMap.get(a.id);
      return {
        id: a.id,
        subjectId: a.subjectId,
        subject: a.subject,
        title: a.title,
        description: a.description ?? undefined,
        maxScore: a.maxScore ?? undefined,
        dueAt: a.dueAt ? a.dueAt.toISOString() : undefined,
        submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              submittedAt: submission.submittedAt.toISOString(),
              score: submission.score ?? undefined,
            }
          : undefined,
      };
    });
  }

  async submitAssignment(
    userId: string,
    assignmentId: string,
    dto: { content?: string; attachmentUrl?: string },
  ) {
    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found',
      });
    }
    const submission = await this.repository.upsertSubmission({
      assignmentId,
      studentId: userId,
      content: dto.content,
      attachmentUrl: dto.attachmentUrl,
    });
    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
      content: submission.content ?? undefined,
      attachmentUrl: submission.attachmentUrl ?? undefined,
    };
  }

  // ---- Attendance (me) ----

  async getMyAttendance(userId: string): Promise<{ data: AttendanceSummaryDto[] }> {
    const records = await this.repository.listAttendanceForStudent(userId);
    const bySubject = new Map<string, AttendanceSummaryDto>();
    for (const record of records) {
      const subjectId = record.subjectId;
      const existing = bySubject.get(subjectId);
      if (existing) {
        existing.records!.push({
          id: record.id,
          subjectId,
          sessionDate: record.sessionDate.toISOString(),
          status: record.status,
        });
      } else {
        bySubject.set(subjectId, {
          subjectId,
          subjectName: record.subject.name,
          subjectCode: record.subject.code,
          percentage: null,
          totalSessions: 0,
          attendedSessions: 0,
          records: [
            {
              id: record.id,
              subjectId,
              sessionDate: record.sessionDate.toISOString(),
              status: record.status,
            },
          ],
        });
      }
    }

    const data: AttendanceSummaryDto[] = [];
    for (const summary of bySubject.values()) {
      const statuses = summary.records!.map((r) => ({ status: r.status as never }));
      summary.percentage = calculateAttendancePercentage(statuses);
      summary.totalSessions = summary.records!.length;
      summary.attendedSessions = statuses.filter((s) =>
        ['present', 'late'].includes(s.status),
      ).length;
      data.push(summary);
    }
    return { data };
  }

  // ---- Marks (me) ----

  async getMyMarks(userId: string) {
    const marks = await this.repository.listMarksForStudent(userId);
    return marks.map((m) => ({
      id: m.id,
      subjectId: m.subjectId,
      subject: m.subject,
      examId: m.examId ?? undefined,
      exam: m.exam ?? undefined,
      marksObtained: m.marksObtained,
      maxMarks: m.maxMarks,
      attempt: m.attempt,
    }));
  }

  // ---- GPA / CGPA ----

  async getMyGpa(userId: string): Promise<GpaResponseDto> {
    const profile = await this.repository.findProfileByUserId(userId);
    const semesterNumber = profile?.currentSemester ?? 1;
    const semester = await this.repository.findSemesterByNumber(semesterNumber);
    const context = await this.studentContext(userId);

    const subjects = await this.repository.listSubjects({
      departmentId: context?.departmentId,
      semesterId: semester?.id ?? context?.semesterId,
      take: 500,
    });
    const subjectIds = subjects.map((s) => s.id);
    const marks = subjectIds.length
      ? await this.repository.listMarksForStudent(userId, subjectIds)
      : [];

    const subjectByExam = new Map<string, { subjectId: string; credit: number }>();
    for (const subject of subjects) {
      subjectByExam.set(subject.id, { subjectId: subject.id, credit: subject.credit });
    }

    const records = marks.map((m) => ({
      subjectId: m.subjectId,
      credit: subjectByExam.get(m.subjectId)?.credit ?? m.subject.credit,
      marksObtained: m.marksObtained,
      maxMarks: m.maxMarks,
      attempt: m.attempt,
    }));

    const result = calculateGpa(records);
    return {
      gpa: result.gpa,
      semester: semesterNumber,
      totalCredits: result.totalCredits,
      totalGradePoints: result.totalGradePoints,
      passedCredits: result.passedCredits,
      attemptedSubjects: result.attemptedSubjects,
      passedSubjects: result.passedSubjects,
      breakdown: result.breakdown as unknown as Array<Record<string, unknown>>,
    };
  }

  async getMyCgpa(userId: string): Promise<CgpaResponseDto> {
    const marks = await this.repository.listMarksForStudent(userId);
    const subjectCredits = new Map<string, number>();
    for (const m of marks) {
      subjectCredits.set(m.subjectId, m.subject.credit);
    }
    const semesterIds = new Set(marks.map((m) => m.subject.semesterId));
    const semesters = await this.repository.listSemesters();

    const semesterNumber = new Map(semesters.map((s) => [s.id, s.number] as const));
    const semesterOrder = new Map([...semesterIds].map((id) => [id, semesterNumber.get(id) ?? 1]));

    const bySemester = new Map<number, typeof marks>();
    for (const m of marks) {
      const num = semesterOrder.get(m.subject.semesterId) ?? 1;
      const bucket = bySemester.get(num);
      if (bucket) {
        bucket.push(m);
      } else {
        bySemester.set(num, [m]);
      }
    }

    const cgpaInput = [...bySemester.entries()].map(([semester, list]) => ({
      semester,
      marks: list.map((m) => ({
        subjectId: m.subjectId,
        credit: subjectCredits.get(m.subjectId) ?? m.subject.credit,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        attempt: m.attempt,
      })),
    }));

    const result = calculateCgpa(cgpaInput);
    return {
      cgpa: result.cgpa,
      totalCredits: result.totalCredits,
      totalGradePoints: result.totalGradePoints,
      passedCredits: result.passedCredits,
      attemptedSubjects: result.attemptedSubjects,
      passedSubjects: result.passedSubjects,
      breakdown: result.breakdown as unknown as Array<Record<string, unknown>>,
    };
  }

  // ---- Academic calendar ----

  async listCalendarEvents(query: {
    from?: string;
    to?: string;
    eventType?: string;
    page: number;
    limit: number;
  }) {
    const where = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      eventType: query.eventType,
    };
    const [total, events] = await Promise.all([
      this.repository.countCalendarEvents(where),
      this.repository.listCalendarEvents({
        ...where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description ?? undefined,
        eventType: e.eventType,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt ? e.endAt.toISOString() : undefined,
        allDay: e.allDay,
      })),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  // ---- helpers ----

  private async studentContext(
    userId: string,
  ): Promise<{ departmentId?: string; semesterId?: string } | null> {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      return null;
    }
    const department = profile.department
      ? await this.repository.findDepartmentByNameOrCode(profile.department, profile.department)
      : undefined;
    const semester =
      profile.currentSemester != null
        ? await this.repository.findSemesterByNumber(profile.currentSemester)
        : undefined;
    return {
      departmentId: department?.id,
      semesterId: semester?.id,
    };
  }

  private async ensureSubject(subjectId: string) {
    const subject = await this.repository.findSubjectById(subjectId);
    if (!subject) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Subject not found' });
    }
    return subject;
  }

  private toSubjectResponse(subject: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    credit: number;
    department: { id: string; name: string; code: string };
    semester: { id: string; number: number; name: string };
    faculty: { id: string; fullName: string; email: string } | null;
  }): SubjectResponseDto {
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      description: subject.description ?? undefined,
      credit: subject.credit,
      department: subject.department,
      semester: subject.semester,
      faculty: subject.faculty ?? undefined,
    };
  }
}
