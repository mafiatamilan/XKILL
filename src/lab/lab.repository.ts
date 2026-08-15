/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Subjects ──

  async createSubject(data: {
    name: string;
    code: string;
    department: string;
    semester: number;
    credits: number;
    language?: string;
    createdBy?: string;
  }) {
    return this.prisma.labSubject.create({ data });
  }

  async findSubjectById(id: string) {
    return this.prisma.labSubject.findUnique({ where: { id } });
  }

  async listSubjects(params: {
    skip: number;
    take: number;
    department?: string;
    semester?: number;
  }) {
    const where: any = {};
    if (params.department) where.department = params.department;
    if (params.semester) where.semester = params.semester;
    const [subjects, total] = await Promise.all([
      this.prisma.labSubject.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.labSubject.count({ where }),
    ]);
    return { subjects, total };
  }

  async updateSubject(
    id: string,
    data: {
      name?: string;
      code?: string;
      department?: string;
      semester?: number;
      credits?: number;
      language?: string;
    },
  ) {
    return this.prisma.labSubject.update({ where: { id }, data });
  }

  async deleteSubject(id: string) {
    return this.prisma.labSubject.delete({ where: { id } });
  }

  // ── Experiments ──

  async createExperiment(subjectId: string, data: any) {
    return this.prisma.labExperiment.create({ data: { ...data, subjectId } });
  }

  async findExperimentById(id: string) {
    return this.prisma.labExperiment.findUnique({ where: { id }, include: { subject: true } });
  }

  async listExperiments(subjectId: string) {
    return this.prisma.labExperiment.findMany({
      where: { subjectId },
      orderBy: { weekNumber: 'asc' },
    });
  }

  async updateExperiment(id: string, data: any) {
    return this.prisma.labExperiment.update({ where: { id }, data });
  }

  async deleteExperiment(id: string) {
    return this.prisma.labExperiment.delete({ where: { id } });
  }

  // ── Submissions ──

  async createSubmission(data: {
    experimentId: string;
    studentId: string;
    sourceCode: string;
    language: string;
    submissionNumber?: number;
  }) {
    return this.prisma.labSubmission.create({
      data: {
        experimentId: data.experimentId,
        studentId: data.studentId,
        sourceCode: data.sourceCode,
        language: data.language,
        submissionNumber: data.submissionNumber ?? 1,
      },
    });
  }

  async findSubmissionById(id: string) {
    return this.prisma.labSubmission.findUnique({ where: { id } });
  }

  async listSubmissions(experimentId: string, studentId?: string) {
    const where: any = { experimentId };
    if (studentId) where.studentId = studentId;
    return this.prisma.labSubmission.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async updateSubmission(id: string, data: any) {
    return this.prisma.labSubmission.update({ where: { id }, data });
  }

  async getStudentSubmissionCount(experimentId: string, studentId: string) {
    return this.prisma.labSubmission.count({ where: { experimentId, studentId } });
  }

  // ── Assignments ──

  async createAssignment(subjectId: string, data: any) {
    return this.prisma.programmingAssignment.create({ data: { ...data, subjectId } });
  }

  async findAssignmentById(id: string) {
    return this.prisma.programmingAssignment.findUnique({ where: { id } });
  }

  async listAssignments(subjectId: string) {
    return this.prisma.programmingAssignment.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAssignment(id: string, data: any) {
    return this.prisma.programmingAssignment.update({ where: { id }, data });
  }

  async deleteAssignment(id: string) {
    return this.prisma.programmingAssignment.delete({ where: { id } });
  }

  // ── Practical Exams ──

  async createExam(subjectId: string, data: any) {
    return this.prisma.practicalExam.create({ data: { ...data, subjectId } });
  }

  async findExamById(id: string) {
    return this.prisma.practicalExam.findUnique({ where: { id } });
  }

  async listExams(subjectId: string) {
    return this.prisma.practicalExam.findMany({
      where: { subjectId },
      orderBy: { startTime: 'desc' },
    });
  }

  async updateExam(id: string, data: any) {
    return this.prisma.practicalExam.update({ where: { id }, data });
  }

  async deleteExam(id: string) {
    return this.prisma.practicalExam.delete({ where: { id } });
  }

  async startExamSession(examId: string, studentId: string) {
    return this.prisma.practicalExamSession.upsert({
      where: { examId_studentId: { examId, studentId } },
      create: { examId, studentId },
      update: {},
    });
  }

  async findExamSession(examId: string, studentId: string) {
    return this.prisma.practicalExamSession.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
  }

  async updateExamSession(id: string, data: any) {
    return this.prisma.practicalExamSession.update({ where: { id }, data });
  }

  // ── Viva ──

  async createViva(subjectId: string, data: any) {
    return this.prisma.vivaRecord.create({ data: { ...data, subjectId } });
  }

  async findVivaById(id: string) {
    return this.prisma.vivaRecord.findUnique({ where: { id } });
  }

  async listVivas(subjectId: string) {
    return this.prisma.vivaRecord.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateViva(id: string, data: any) {
    return this.prisma.vivaRecord.update({ where: { id }, data });
  }

  async deleteViva(id: string) {
    return this.prisma.vivaRecord.delete({ where: { id } });
  }

  // ── Mini Projects ──

  async createMiniProject(subjectId: string, data: any) {
    return this.prisma.miniProject.create({ data: { ...data, subjectId } });
  }

  async findMiniProjectById(id: string) {
    return this.prisma.miniProject.findUnique({ where: { id } });
  }

  async listMiniProjects(subjectId: string) {
    return this.prisma.miniProject.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMiniProject(id: string, data: any) {
    return this.prisma.miniProject.update({ where: { id }, data });
  }

  async deleteMiniProject(id: string) {
    return this.prisma.miniProject.delete({ where: { id } });
  }

  // ── Attendance ──

  async markAttendance(data: {
    subjectId: string;
    studentId: string;
    type: string;
    metadata?: any;
  }) {
    return this.prisma.labAttendance.create({ data });
  }

  async listAttendance(
    subjectId: string,
    params: { studentId?: string; startDate?: Date; endDate?: Date },
  ) {
    const where: any = { subjectId };
    if (params.studentId) where.studentId = params.studentId;
    if (params.startDate || params.endDate) {
      where.markedAt = {};
      if (params.startDate) where.markedAt.gte = params.startDate;
      if (params.endDate) where.markedAt.lte = params.endDate;
    }
    return this.prisma.labAttendance.findMany({ where, orderBy: { markedAt: 'desc' } });
  }

  async getAttendanceCount(subjectId: string, studentId: string) {
    return this.prisma.labAttendance.count({ where: { subjectId, studentId } });
  }

  // ── OBE ──

  async createCourseOutcome(subjectId: string, data: { code: string; description: string }) {
    return this.prisma.courseOutcome.create({ data: { ...data, subjectId } });
  }

  async listCourseOutcomes(subjectId: string) {
    return this.prisma.courseOutcome.findMany({ where: { subjectId }, orderBy: { code: 'asc' } });
  }

  async deleteCourseOutcome(id: string) {
    return this.prisma.courseOutcome.delete({ where: { id } });
  }

  async createProgramOutcome(data: { code: string; description: string }) {
    return this.prisma.programOutcome.create({ data });
  }

  async listProgramOutcomes() {
    return this.prisma.programOutcome.findMany({ orderBy: { code: 'asc' } });
  }

  async deleteProgramOutcome(id: string) {
    return this.prisma.programOutcome.delete({ where: { id } });
  }

  async createCoPoMapping(data: { coId: string; poId: string; attainmentLevel: number }) {
    return this.prisma.coPoMapping.upsert({
      where: { coId_poId: { coId: data.coId, poId: data.poId } },
      create: data,
      update: { attainmentLevel: data.attainmentLevel },
    });
  }

  async getCoPoMappings(subjectId: string) {
    return this.prisma.coPoMapping.findMany({
      where: { co: { subjectId } },
      include: { co: true, po: true },
    });
  }

  // ── Plagiarism ──

  async createPlagiarismReport(data: {
    submissionId: string;
    studentId: string;
    comparedWithId?: string;
    comparisonType: string;
    similarityPct: number;
    matchedSegments?: any;
    reportUrl?: string;
  }) {
    return this.prisma.plagiarismReport.create({ data });
  }

  async listPlagiarismReports(submissionId: string) {
    return this.prisma.plagiarismReport.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Analytics ──

  async getSubjectAnalytics(subjectId: string) {
    const [experimentCount, submissionCount, studentCount, examCount] = await Promise.all([
      this.prisma.labExperiment.count({ where: { subjectId } }),
      this.prisma.labSubmission.count({ where: { experiment: { subjectId } } }),
      this.prisma.labSubmission.findMany({
        where: { experiment: { subjectId } },
        select: { studentId: true },
        distinct: ['studentId'],
      }),
      this.prisma.practicalExam.count({ where: { subjectId } }),
    ]);
    return { experimentCount, submissionCount, studentCount: studentCount.length, examCount };
  }

  async getStudentAnalytics(studentId: string) {
    const [subjects, submissions, avgScore] = await Promise.all([
      this.prisma.labAttendance.findMany({
        where: { studentId },
        select: { subjectId: true },
        distinct: ['subjectId'],
      }),
      this.prisma.labSubmission.count({ where: { studentId } }),
      this.prisma.labSubmission.aggregate({
        where: { studentId, status: 'graded' },
        _avg: { totalScore: true },
      }),
    ]);
    return {
      subjectCount: subjects.length,
      submissionCount: submissions,
      avgScore: avgScore._avg.totalScore ?? 0,
    };
  }
}
