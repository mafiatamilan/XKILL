import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Student Analytics ──────────────────────────────────────────────────

  async getStudentProfile(studentId: string) {
    return this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
            role: { select: { name: true } },
          },
        },
      },
    });
  }

  async getStudentAcademicStats(studentId: string) {
    const [attendance, marks, exams, assignments] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { studentId },
        _count: { id: true },
      }),
      this.prisma.internalMark.aggregate({
        where: { studentId },
        _avg: { marksObtained: true },
        _max: { marksObtained: true },
        _count: { id: true },
      }),
      this.prisma.exam.count({
        where: {
          subject: {
            attendanceRecords: { some: { studentId } },
          },
        },
      }),
      this.prisma.assignmentSubmission.count({
        where: { studentId },
      }),
    ]);

    const totalAttendance = attendance.reduce((sum, a) => sum + a._count.id, 0);
    const presentCount = attendance.find((a) => a.status === 'present')?._count.id ?? 0;

    return {
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      totalClasses: totalAttendance,
      presentCount,
      averageMarks: marks._avg.marksObtained ?? 0,
      highestMarks: marks._max.marksObtained ?? 0,
      totalExams: exams,
      assignmentSubmissions: assignments,
    };
  }

  async getStudentDsaStats(studentId: string) {
    const [submissions, solvedProblems, rating] = await Promise.all([
      this.prisma.submission.aggregate({
        where: { userId: studentId },
        _count: { id: true },
      }),
      this.prisma.solvedProblem.count({
        where: { userId: studentId },
      }),
      this.prisma.codingRating.findUnique({
        where: { userId: studentId },
        select: { rating: true },
      }),
    ]);

    const totalSubmissions = submissions._count.id;
    const currentRating = rating?.rating ?? 1200;
    const currentTier = this.getTierFromRating(currentRating);

    return {
      totalSubmissions,
      solvedProblems,
      currentRating,
      currentTier,
    };
  }

  private getTierFromRating(rating: number): string {
    if (rating >= 2800) return 'Legendary';
    if (rating >= 2400) return 'Grandmaster';
    if (rating >= 2000) return 'Master';
    if (rating >= 1800) return 'Expert';
    if (rating >= 1600) return 'Advanced';
    if (rating >= 1400) return 'Intermediate';
    if (rating >= 1200) return 'Amateur';
    return 'Beginner';
  }

  async getStudentGamificationStats(studentId: string) {
    const [xp, streak, achievements] = await Promise.all([
      this.prisma.xpLedger.aggregate({
        where: { userId: studentId },
        _sum: { amount: true },
      }),
      this.prisma.streak.findUnique({
        where: { userId: studentId },
        select: { currentStreak: true, longestStreak: true },
      }),
      this.prisma.achievement.count({
        where: { userId: studentId },
      }),
    ]);

    return {
      totalXp: xp._sum.amount ?? 0,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      badgesEarned: achievements,
    };
  }

  async getStudentPlacementStats(studentId: string) {
    const [readinessScore, jobApplications, savedJobs] = await Promise.all([
      this.prisma.readinessScore.findUnique({
        where: { userId: studentId },
        select: { overall: true, calculatedAt: true },
      }),
      this.prisma.jobApplication.count({
        where: { userId: studentId },
      }),
      this.prisma.savedJob.count({
        where: { userId: studentId },
      }),
    ]);

    return {
      readinessScore: readinessScore?.overall ?? null,
      readinessCalculatedAt: readinessScore?.calculatedAt ?? null,
      jobApplications,
      savedJobs,
    };
  }

  async getStudentCertificates(studentId: string) {
    const [totalCertificates, revokedCertificates] = await Promise.all([
      this.prisma.certificate.count({
        where: { userId: studentId },
      }),
      this.prisma.certificate.count({
        where: { userId: studentId, isRevoked: true },
      }),
    ]);

    return {
      totalCertificates,
      revokedCertificates,
      activeCertificates: totalCertificates - revokedCertificates,
    };
  }

  async getStudentInterviewStats(studentId: string) {
    const [totalSessions, completedSessions, reports] = await Promise.all([
      this.prisma.interviewSession.count({
        where: { userId: studentId },
      }),
      this.prisma.interviewSession.count({
        where: { userId: studentId, status: 'ended' },
      }),
      this.prisma.interviewReport.findMany({
        where: { session: { userId: studentId } },
        select: { overallScore: true },
      }),
    ]);

    const averageScore =
      reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)
        : 0;

    return {
      totalSessions,
      completedSessions,
      averageScore,
    };
  }

  // ── Recruiter Analytics ────────────────────────────────────────────────

  async getRecruiterProfile(recruiterId: string) {
    return this.prisma.recruiterProfile.findUnique({
      where: { userId: recruiterId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async getRecruiterJobStats(recruiterId: string) {
    const [totalJobs, activeJobs, totalApplications] = await Promise.all([
      this.prisma.jobListing.count({
        where: { recruiterId },
      }),
      this.prisma.jobListing.count({
        where: { recruiterId, isActive: true },
      }),
      this.prisma.jobApplication.count({
        where: { job: { recruiterId } },
      }),
    ]);

    return { totalJobs, activeJobs, totalApplications };
  }

  async getRecruiterApplicationStats(recruiterId: string) {
    const byStatus = await this.prisma.jobApplication.groupBy({
      by: ['status'],
      where: { job: { recruiterId } },
      _count: { id: true },
    });

    const total = byStatus.reduce((sum, s) => sum + s._count.id, 0);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  async getRecruiterHiringFunnel(recruiterId: string) {
    const [shortlisted, interviewed, offered] = await Promise.all([
      this.prisma.shortlist.count({
        where: { recruiterId },
      }),
      this.prisma.interviewSchedule.count({
        where: { job: { recruiterId } },
      }),
      this.prisma.jobApplication.count({
        where: { job: { recruiterId }, status: 'accepted' },
      }),
    ]);

    return { shortlisted, interviewed, offered };
  }

  // ── Faculty Analytics ──────────────────────────────────────────────────

  async getFacultyProfile(facultyId: string) {
    return this.prisma.user.findUnique({
      where: { id: facultyId },
      select: {
        id: true,
        fullName: true,
        email: true,
        facultySubjects: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async getFacultySubjectStats(facultyId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { facultyId },
      include: {
        _count: {
          select: {
            attendanceRecords: true,
            exams: true,
            assignments: true,
          },
        },
      },
    });

    return subjects.map((s) => ({
      subjectId: s.id,
      name: s.name,
      code: s.code,
      attendanceRecords: s._count.attendanceRecords,
      exams: s._count.exams,
      assignments: s._count.assignments,
    }));
  }

  async getFacultyStudentPerformance(facultyId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { facultyId },
      select: { id: true },
    });

    const subjectIds = subjects.map((s) => s.id);

    const marks = await this.prisma.internalMark.groupBy({
      by: ['studentId'],
      where: { subjectId: { in: subjectIds } },
      _avg: { marksObtained: true },
      _count: { id: true },
      orderBy: { _avg: { marksObtained: 'desc' } },
      take: 10,
    });

    const studentIds = marks.map((m) => m.studentId);
    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s.fullName]));

    return marks.map((m) => ({
      studentId: m.studentId,
      studentName: studentMap.get(m.studentId) ?? 'Unknown',
      averageMarks: Math.round(m._avg.marksObtained ?? 0),
      examCount: m._count.id,
    }));
  }

  async getFacultyAttendanceOverview(facultyId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { facultyId },
      select: { id: true },
    });

    const subjectIds = subjects.map((s) => s.id);

    const attendance = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { subjectId: { in: subjectIds } },
      _count: { id: true },
    });

    const total = attendance.reduce((sum, a) => sum + a._count.id, 0);
    const present = attendance.find((a) => a.status === 'present')?._count.id ?? 0;

    return {
      totalRecords: total,
      presentCount: present,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      byStatus: attendance.map((a) => ({ status: a.status, count: a._count.id })),
    };
  }

  // ── Placement Analytics ────────────────────────────────────────────────

  async getPlacementOverview() {
    const [totalDrives, placedStudents, totalOffers, activeDrives] = await Promise.all([
      this.prisma.companyDrive.count(),
      this.prisma.offerRecord.count({
        where: { status: 'joined' },
      }),
      this.prisma.offerRecord.count(),
      this.prisma.companyDrive.count({
        where: { status: 'scheduled' },
      }),
    ]);

    const offersByStatus = await this.prisma.offerRecord.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return {
      totalDrives,
      activeDrives,
      placedStudents,
      totalOffers,
      offersByStatus: offersByStatus.map((o) => ({ status: o.status, count: o._count.id })),
    };
  }

  async getPlacementByDepartment() {
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      departments.map(async (dept) => {
        const profiles = await this.prisma.studentProfile.findMany({
          where: { department: dept.name },
          select: { userId: true },
        });

        const userIds = profiles.map((p) => p.userId);

        const placedCount = await this.prisma.offerRecord.count({
          where: {
            studentId: { in: userIds },
            status: 'joined',
          },
        });

        const totalStudents = profiles.length;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalStudents,
          placedStudents: placedCount,
          placementRate: totalStudents > 0 ? Math.round((placedCount / totalStudents) * 100) : 0,
        };
      }),
    );

    return results;
  }

  async getTopRecruiters(limit: number) {
    const companies = await this.prisma.companyProfile.findMany({
      include: {
        jobListings: {
          include: {
            applications: {
              select: { status: true },
            },
          },
        },
        companyDrives: {
          include: {
            offerRecords: {
              select: { status: true, ctcLakhs: true },
            },
          },
        },
      },
      take: limit,
    });

    return companies
      .map((company) => {
        const totalApplications = company.jobListings.reduce(
          (sum, j) => sum + j.applications.length,
          0,
        );
        const allOffers = company.companyDrives.flatMap((d) => d.offerRecords);
        const totalOffers = allOffers.length;
        const placedCount = allOffers.filter((o) => o.status === 'joined').length;
        const avgCtc =
          allOffers.length > 0
            ? Math.round(allOffers.reduce((sum, o) => sum + o.ctcLakhs, 0) / allOffers.length)
            : 0;

        return {
          companyId: company.id,
          companyName: company.name,
          totalApplications,
          totalOffers,
          placedCount,
          averageCtc: avgCtc,
        };
      })
      .sort((a, b) => b.placedCount - a.placedCount);
  }

  // ── College Analytics ──────────────────────────────────────────────────

  async getCollegeOverview(collegeId?: string) {
    const departmentFilter = collegeId
      ? await this.prisma.department.findUnique({
          where: { id: collegeId },
          select: { name: true },
        })
      : null;

    const profileWhere = departmentFilter ? { department: departmentFilter.name } : {};

    const [totalStudents, totalFaculty, departments] = await Promise.all([
      this.prisma.studentProfile.count({ where: profileWhere }),
      this.prisma.user.count({
        where: {
          role: { name: 'faculty' },
          deletedAt: null,
        },
      }),
      this.prisma.department.findMany({
        select: { id: true, name: true },
      }),
    ]);

    return {
      totalStudents,
      totalFaculty,
      totalDepartments: departments.length,
      departments,
    };
  }

  async getDepartmentStats() {
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      departments.map(async (dept) => {
        const studentCount = await this.prisma.studentProfile.count({
          where: { department: dept.name },
        });

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          studentCount,
        };
      }),
    );

    return results;
  }

  // ── Revenue Analytics ──────────────────────────────────────────────────

  async getRevenueOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalCertificates, recentCertificates, totalBookings] = await Promise.all([
      this.prisma.certificate.count(),
      this.prisma.certificate.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.booking.count({
        where: { status: 'confirmed' },
      }),
    ]);

    return {
      totalCertificates,
      recentCertificates,
      totalBookings,
    };
  }

  // ── Custom Report Builder ──────────────────────────────────────────────

  async executeCustomReport(query: {
    entity: string;
    filters?: Record<string, unknown>;
    fields?: string[];
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }) {
    const { entity, filters, fields, sortBy, order, limit } = query;

    const validEntities = [
      'user',
      'studentProfile',
      'jobListing',
      'jobApplication',
      'submission',
      'solvedProblem',
      'certificate',
      'booking',
      'companyDrive',
      'offerRecord',
      'interviewSession',
    ] as const;

    if (!validEntities.includes(entity as never)) {
      throw new Error(`Invalid entity: ${entity}`);
    }

    const where = this.buildWhereClause(filters ?? {});
    const select = fields && fields.length > 0 ? this.buildSelectClause(fields) : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.prisma as any)[entity].findMany({
      where,
      select,
      orderBy: sortBy ? { [sortBy]: order ?? 'desc' } : undefined,
      take: limit ?? 100,
    });

    return {
      entity,
      count: result.length,
      data: result,
    };
  }

  private buildWhereClause(filters: Record<string, unknown>): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        if (nested.min !== undefined || nested.max !== undefined) {
          const range: Record<string, unknown> = {};
          if (nested.min !== undefined) range.gte = nested.min;
          if (nested.max !== undefined) range.lte = nested.max;
          where[key] = range;
        }
      } else if (Array.isArray(value)) {
        where[key] = { in: value };
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  private buildSelectClause(fields: string[]): Record<string, boolean> {
    const select: Record<string, boolean> = {};
    for (const field of fields) {
      select[field] = true;
    }
    return select;
  }
}
