/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LabRepository } from './lab.repository';

@Injectable()
export class LabService {
  constructor(private readonly repository: LabRepository) {}

  // ── Subjects ──

  async createSubject(userId: string, dto: any) {
    return this.repository.createSubject({ ...dto, createdBy: userId });
  }

  async getSubject(id: string) {
    const subject = await this.repository.findSubjectById(id);
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async listSubjects(page = 1, limit = 20, department?: string, semester?: number) {
    const skip = (page - 1) * limit;
    const { subjects, total } = await this.repository.listSubjects({
      skip,
      take: limit,
      department,
      semester,
    });
    return { data: subjects, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateSubject(id: string, dto: any) {
    await this.getSubject(id);
    return this.repository.updateSubject(id, dto);
  }

  async deleteSubject(id: string) {
    await this.getSubject(id);
    await this.repository.deleteSubject(id);
  }

  // ── Experiments ──

  async createExperiment(subjectId: string, dto: any) {
    await this.getSubject(subjectId);
    return this.repository.createExperiment(subjectId, dto);
  }

  async getExperiment(id: string) {
    const exp = await this.repository.findExperimentById(id);
    if (!exp) throw new NotFoundException('Experiment not found');
    return exp;
  }

  async listExperiments(subjectId: string) {
    await this.getSubject(subjectId);
    return this.repository.listExperiments(subjectId);
  }

  async updateExperiment(id: string, dto: any) {
    await this.getExperiment(id);
    return this.repository.updateExperiment(id, dto);
  }

  async deleteExperiment(id: string) {
    await this.getExperiment(id);
    await this.repository.deleteExperiment(id);
  }

  // ── Submissions ──

  async submitExperiment(
    experimentId: string,
    studentId: string,
    dto: { sourceCode: string; language: string; isDraft?: boolean },
  ) {
    await this.getExperiment(experimentId);
    const submissionCount = await this.repository.getStudentSubmissionCount(
      experimentId,
      studentId,
    );
    const submission = await this.repository.createSubmission({
      experimentId,
      studentId,
      sourceCode: dto.sourceCode,
      language: dto.language,
      submissionNumber: submissionCount + 1,
    });
    return submission;
  }

  async getSubmissionResults(id: string) {
    const sub = await this.repository.findSubmissionById(id);
    if (!sub) throw new NotFoundException('Submission not found');
    return {
      id: sub.id,
      status: sub.status,
      compilationScore: sub.compilationScore,
      correctnessScore: sub.correctnessScore,
      efficiencyScore: sub.efficiencyScore,
      codingStandardsScore: sub.codingStandardsScore,
      documentationScore: sub.documentationScore,
      totalScore: sub.totalScore,
      feedback: sub.feedback,
    };
  }

  async evaluateSubmission(
    id: string,
    dto: {
      compilationScore?: number;
      correctnessScore?: number;
      efficiencyScore?: number;
      codingStandardsScore?: number;
      documentationScore?: number;
      feedback?: string;
    },
  ) {
    const sub = await this.repository.findSubmissionById(id);
    if (!sub) throw new NotFoundException('Submission not found');
    const totalScore =
      (dto.compilationScore ?? 0) +
      (dto.correctnessScore ?? 0) +
      (dto.efficiencyScore ?? 0) +
      (dto.codingStandardsScore ?? 0) +
      (dto.documentationScore ?? 0);
    return this.repository.updateSubmission(id, {
      ...dto,
      totalScore,
      status: 'graded',
    });
  }

  // ── Assignments ──

  async createAssignment(subjectId: string, dto: any) {
    await this.getSubject(subjectId);
    return this.repository.createAssignment(subjectId, dto);
  }

  async getAssignment(id: string) {
    const a = await this.repository.findAssignmentById(id);
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  async listAssignments(subjectId: string) {
    await this.getSubject(subjectId);
    return this.repository.listAssignments(subjectId);
  }

  async updateAssignment(id: string, dto: any) {
    await this.getAssignment(id);
    return this.repository.updateAssignment(id, dto);
  }

  async deleteAssignment(id: string) {
    await this.getAssignment(id);
    await this.repository.deleteAssignment(id);
  }

  // ── Practical Exams ──

  async createExam(subjectId: string, dto: any) {
    await this.getSubject(subjectId);
    return this.repository.createExam(subjectId, dto);
  }

  async getExam(id: string) {
    const e = await this.repository.findExamById(id);
    if (!e) throw new NotFoundException('Exam not found');
    return e;
  }

  async listExams(subjectId: string) {
    await this.getSubject(subjectId);
    return this.repository.listExams(subjectId);
  }

  async startExamSession(examId: string, studentId: string) {
    const exam = await this.getExam(examId);
    const now = new Date();
    if (now < exam.startTime) throw new BadRequestException('Exam has not started yet');
    if (now > exam.endTime) throw new BadRequestException('Exam has ended');
    return this.repository.startExamSession(examId, studentId);
  }

  async submitExam(examId: string, studentId: string) {
    const session = await this.repository.findExamSession(examId, studentId);
    if (!session) throw new NotFoundException('Exam session not found');
    if (session.status !== 'in_progress')
      throw new BadRequestException('Session is not in progress');
    return this.repository.updateExamSession(session.id, {
      status: 'submitted',
      submittedAt: new Date(),
    });
  }

  async updateExam(id: string, dto: any) {
    await this.getExam(id);
    return this.repository.updateExam(id, dto);
  }

  async deleteExam(id: string) {
    await this.getExam(id);
    await this.repository.deleteExam(id);
  }

  // ── Viva ──

  async createViva(subjectId: string, dto: any) {
    await this.getSubject(subjectId);
    return this.repository.createViva(subjectId, dto);
  }

  async getViva(id: string) {
    const v = await this.repository.findVivaById(id);
    if (!v) throw new NotFoundException('Viva record not found');
    return v;
  }

  async listVivas(subjectId: string) {
    await this.getSubject(subjectId);
    return this.repository.listVivas(subjectId);
  }

  async updateViva(id: string, dto: any) {
    await this.getViva(id);
    return this.repository.updateViva(id, dto);
  }

  async deleteViva(id: string) {
    await this.getViva(id);
    await this.repository.deleteViva(id);
  }

  // ── Mini Projects ──

  async createMiniProject(subjectId: string, dto: any) {
    await this.getSubject(subjectId);
    return this.repository.createMiniProject(subjectId, dto);
  }

  async getMiniProject(id: string) {
    const p = await this.repository.findMiniProjectById(id);
    if (!p) throw new NotFoundException('Mini project not found');
    return p;
  }

  async listMiniProjects(subjectId: string) {
    await this.getSubject(subjectId);
    return this.repository.listMiniProjects(subjectId);
  }

  async evaluateMiniProject(
    id: string,
    dto: { evaluationScore: number; evaluationFeedback: string },
  ) {
    await this.getMiniProject(id);
    return this.repository.updateMiniProject(id, dto);
  }

  async updateMiniProject(id: string, dto: any) {
    await this.getMiniProject(id);
    return this.repository.updateMiniProject(id, dto);
  }

  async deleteMiniProject(id: string) {
    await this.getMiniProject(id);
    await this.repository.deleteMiniProject(id);
  }

  // ── Attendance ──

  async markAttendance(
    subjectId: string,
    studentId: string,
    dto: { type: string; metadata?: any },
  ) {
    await this.getSubject(subjectId);
    return this.repository.markAttendance({ subjectId, studentId, ...dto });
  }

  async listAttendance(subjectId: string, studentId?: string) {
    await this.getSubject(subjectId);
    return this.repository.listAttendance(subjectId, { studentId });
  }

  // ── OBE ──

  async createCourseOutcome(subjectId: string, dto: { code: string; description: string }) {
    await this.getSubject(subjectId);
    return this.repository.createCourseOutcome(subjectId, dto);
  }

  async listCourseOutcomes(subjectId: string) {
    return this.repository.listCourseOutcomes(subjectId);
  }

  async createProgramOutcome(dto: { code: string; description: string }) {
    return this.repository.createProgramOutcome(dto);
  }

  async listProgramOutcomes() {
    return this.repository.listProgramOutcomes();
  }

  async createCoPoMapping(dto: { coId: string; poId: string; attainmentLevel: number }) {
    return this.repository.createCoPoMapping(dto);
  }

  async getAttainmentReport(subjectId: string) {
    const mappings = await this.repository.getCoPoMappings(subjectId);
    const outcomes = await this.repository.listCourseOutcomes(subjectId);
    const poList = await this.repository.listProgramOutcomes();
    return {
      subjectId,
      courseOutcomes: outcomes,
      programOutcomes: poList,
      mappings: mappings.map((m) => ({
        coCode: m.co.code,
        poCode: m.po.code,
        attainmentLevel: m.attainmentLevel,
      })),
    };
  }

  // ── Analytics ──

  async getFacultyAnalytics(subjectId: string) {
    return this.repository.getSubjectAnalytics(subjectId);
  }

  async getStudentAnalytics(studentId: string) {
    return this.repository.getStudentAnalytics(studentId);
  }

  async getSemesterDashboard(studentId: string) {
    const analytics = await this.repository.getStudentAnalytics(studentId);
    return {
      ...analytics,
      message: 'Semester dashboard data',
    };
  }
}
