import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  // ── Student Analytics ──────────────────────────────────────────────────

  async getStudentAnalytics(studentId: string) {
    const profile = await this.repository.getStudentProfile(studentId);
    if (!profile) {
      throw new NotFoundException('STUDENT_NOT_FOUND');
    }

    const [academics, dsa, gamification, placement, certificates, interviews] = await Promise.all([
      this.repository.getStudentAcademicStats(studentId),
      this.repository.getStudentDsaStats(studentId),
      this.repository.getStudentGamificationStats(studentId),
      this.repository.getStudentPlacementStats(studentId),
      this.repository.getStudentCertificates(studentId),
      this.repository.getStudentInterviewStats(studentId),
    ]);

    return {
      studentId: profile.userId,
      studentName: profile.user.fullName,
      department: profile.department ?? 'N/A',
      email: profile.user.email,
      joinedAt: profile.user.createdAt.toISOString(),
      academics,
      dsa,
      gamification,
      placement,
      certificates,
      interviews,
    };
  }

  // ── Recruiter Analytics ────────────────────────────────────────────────

  async getRecruiterAnalytics(recruiterId: string) {
    const profile = await this.repository.getRecruiterProfile(recruiterId);
    if (!profile) {
      throw new NotFoundException('RECRUITER_NOT_FOUND');
    }

    const [jobs, applications, hiringFunnel] = await Promise.all([
      this.repository.getRecruiterJobStats(recruiterId),
      this.repository.getRecruiterApplicationStats(recruiterId),
      this.repository.getRecruiterHiringFunnel(recruiterId),
    ]);

    return {
      recruiterId: profile.userId,
      recruiterName: profile.user.fullName,
      company: profile.company?.name ?? 'N/A',
      jobs,
      applications,
      hiringFunnel,
    };
  }

  // ── Faculty Analytics ──────────────────────────────────────────────────

  async getFacultyAnalytics(facultyId: string) {
    const profile = await this.repository.getFacultyProfile(facultyId);
    if (!profile) {
      throw new NotFoundException('FACULTY_NOT_FOUND');
    }

    const [subjects, topStudents, attendance] = await Promise.all([
      this.repository.getFacultySubjectStats(facultyId),
      this.repository.getFacultyStudentPerformance(facultyId),
      this.repository.getFacultyAttendanceOverview(facultyId),
    ]);

    return {
      facultyId: profile.id,
      facultyName: profile.fullName,
      subjects,
      topStudents,
      attendance,
    };
  }

  // ── Placement Analytics ────────────────────────────────────────────────

  async getPlacementAnalytics() {
    const [overview, byDepartment, topRecruiters] = await Promise.all([
      this.repository.getPlacementOverview(),
      this.repository.getPlacementByDepartment(),
      this.repository.getTopRecruiters(10),
    ]);

    return { overview, byDepartment, topRecruiters };
  }

  // ── College Analytics ──────────────────────────────────────────────────

  async getCollegeAnalytics(collegeId?: string) {
    const overview = await this.repository.getCollegeOverview(collegeId);
    const departments = await this.repository.getDepartmentStats();

    return {
      overview: {
        totalStudents: overview.totalStudents,
        totalFaculty: overview.totalFaculty,
        totalDepartments: overview.totalDepartments,
      },
      departments,
    };
  }

  // ── Revenue Analytics ──────────────────────────────────────────────────

  async getRevenueAnalytics() {
    return this.repository.getRevenueOverview();
  }

  // ── Custom Report Builder ──────────────────────────────────────────────

  async generateCustomReport(dto: {
    entity: string;
    filters?: Record<string, unknown>;
    fields?: string[];
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    format?: string;
  }) {
    const result = await this.repository.executeCustomReport({
      entity: dto.entity,
      filters: dto.filters,
      fields: dto.fields,
      sortBy: dto.sortBy,
      order: dto.order,
      limit: dto.limit,
    });

    if (dto.format === 'csv') {
      return {
        ...result,
        format: 'csv',
        csv: this.convertToCsv(result.data),
      };
    }

    return {
      ...result,
      format: 'json',
    };
  }

  private convertToCsv(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers
        .map((h) => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === 'string' && value.includes(','))
            return `"${value.replace(/"/g, '""')}"`;
          return String(value);
        })
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
