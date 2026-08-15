import { IsString, IsOptional, IsArray, IsIn, IsNumber, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Student Analytics ────────────────────────────────────────────────────

export class StudentAnalyticsResponseDto {
  @ApiProperty() studentId: string;
  @ApiProperty() studentName: string;
  @ApiProperty() department: string;
  @ApiProperty() email: string;
  @ApiProperty() joinedAt: string;
  @ApiProperty() academics: {
    attendanceRate: number;
    totalClasses: number;
    averageMarks: number;
    highestMarks: number;
    totalExams: number;
    assignmentSubmissions: number;
  };
  @ApiProperty() dsa: {
    totalSubmissions: number;
    solvedProblems: number;
    currentRating: number;
    currentTier: string;
  };
  @ApiProperty() gamification: {
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    badgesEarned: number;
  };
  @ApiProperty() placement: {
    readinessScore: number | null;
    jobApplications: number;
    savedJobs: number;
  };
  @ApiProperty() certificates: {
    totalCertificates: number;
    activeCertificates: number;
    revokedCertificates: number;
  };
  @ApiProperty() interviews: {
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
  };
}

// ── Recruiter Analytics ──────────────────────────────────────────────────

export class RecruiterAnalyticsResponseDto {
  @ApiProperty() recruiterId: string;
  @ApiProperty() recruiterName: string;
  @ApiProperty() company: string;
  @ApiProperty() jobs: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
  };
  @ApiProperty() applications: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  @ApiProperty() hiringFunnel: {
    shortlisted: number;
    interviewed: number;
    offered: number;
  };
}

// ── Faculty Analytics ────────────────────────────────────────────────────

export class FacultyAnalyticsResponseDto {
  @ApiProperty() facultyId: string;
  @ApiProperty() facultyName: string;
  @ApiProperty() subjects: Array<{
    subjectId: string;
    name: string;
    code: string;
    attendanceRecords: number;
    exams: number;
    assignments: number;
  }>;
  @ApiProperty() topStudents: Array<{
    studentId: string;
    studentName: string;
    averageMarks: number;
    examCount: number;
  }>;
  @ApiProperty() attendance: {
    totalRecords: number;
    presentCount: number;
    attendanceRate: number;
    byStatus: Array<{ status: string; count: number }>;
  };
}

// ── Placement Analytics ──────────────────────────────────────────────────

export class PlacementAnalyticsResponseDto {
  @ApiProperty() overview: {
    totalDrives: number;
    activeDrives: number;
    placedStudents: number;
    totalOffers: number;
    offersByStatus: Array<{ status: string; count: number }>;
  };
  @ApiProperty() byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    totalStudents: number;
    placedStudents: number;
    placementRate: number;
  }>;
  @ApiProperty() topRecruiters: Array<{
    companyId: string;
    companyName: string;
    totalApplications: number;
    totalOffers: number;
    placedCount: number;
    averageCtc: number;
  }>;
}

// ── College Analytics ────────────────────────────────────────────────────

export class CollegeAnalyticsResponseDto {
  @ApiProperty() overview: {
    totalStudents: number;
    totalFaculty: number;
    totalDepartments: number;
  };
  @ApiProperty() departments: Array<{
    departmentId: string;
    departmentName: string;
    studentCount: number;
  }>;
}

// ── Revenue Analytics ────────────────────────────────────────────────────

export class RevenueAnalyticsResponseDto {
  @ApiProperty() certificates: {
    totalCertificates: number;
    recentCertificates: number;
  };
  @ApiProperty() mentorship: {
    totalBookings: number;
  };
}

// ── Custom Report DTOs ───────────────────────────────────────────────────

export const REPORT_ENTITIES = [
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

export type ReportEntity = (typeof REPORT_ENTITIES)[number];

export const REPORT_FORMATS = ['json', 'csv'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export class CustomReportDto {
  @ApiProperty({ enum: REPORT_ENTITIES, example: 'studentProfile' })
  @IsString()
  @IsIn(REPORT_ENTITIES)
  entity: string;

  @ApiPropertyOptional({ description: 'Filter conditions', example: { departmentId: 'dep-1' } })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Fields to include', example: ['userId', 'departmentId'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 100, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: 'json' })
  @IsOptional()
  @IsString()
  @IsIn(REPORT_FORMATS)
  format?: string;
}

export class CustomReportResponseDto {
  @ApiProperty() entity: string;
  @ApiProperty() count: number;
  @ApiProperty() data: Record<string, unknown>[];
}
