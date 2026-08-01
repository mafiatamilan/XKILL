import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const EXAM_TYPES = ['internal', 'midterm', 'endterm', 'practical'] as const;
export const MATERIAL_TYPES = ['note', 'slide', 'video', 'link', 'reference'] as const;
export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const CALENDAR_EVENT_TYPES = ['academic', 'exam', 'holiday', 'event', 'deadline'] as const;

// ---------------------------------------------------------------------------
// Student-facing /academics/*
// ---------------------------------------------------------------------------

export class DepartmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string;
}

export class SemesterResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional() scheme?: string;
}

export class SubjectListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by department id' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by semester id' })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiPropertyOptional({ description: 'Search by subject name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class SubjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() credit: number;
  @ApiProperty({ type: () => DepartmentResponseDto }) department: DepartmentResponseDto;
  @ApiProperty({ type: () => SemesterResponseDto }) semester: SemesterResponseDto;
  @ApiPropertyOptional() faculty?: { id: string; fullName: string; email: string };
}

export class StudyMaterialResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() subjectId: string;
  @ApiProperty() title: string;
  @ApiProperty() type: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() uploadedBy?: string;
  @ApiProperty() createdAt: string;
}

export class TimetableSlotResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() subjectId: string;
  @ApiProperty() dayOfWeek: number;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiPropertyOptional() room?: string;
}

export class ExamResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() examType: string;
  @ApiProperty() maxMarks: number;
  @ApiPropertyOptional() scheduledAt?: string;
  @ApiProperty() subjectId: string;
  @ApiPropertyOptional() subject?: { id: string; code: string; name: string };
}

export class AssignmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() subjectId: string;
  @ApiPropertyOptional() subject?: { id: string; code: string; name: string };
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() maxScore?: number;
  @ApiPropertyOptional() dueAt?: string;
  @ApiPropertyOptional() submission?: {
    id: string;
    status: string;
    submittedAt: string;
    score?: number;
  };
}

export class AttendanceRowDto {
  @ApiProperty() id: string;
  @ApiProperty() subjectId: string;
  @ApiPropertyOptional() subject?: { id: string; code: string; name: string };
  @ApiProperty() sessionDate: string;
  @ApiProperty() status: string;
}

export class AttendanceSummaryDto {
  @ApiProperty() subjectId: string;
  @ApiProperty() subjectName: string;
  @ApiPropertyOptional() subjectCode?: string;
  @ApiProperty({ description: 'Attendance percentage 0-100, null when no sessions yet' })
  percentage: number | null;
  @ApiProperty() totalSessions: number;
  @ApiProperty() attendedSessions: number;
  @ApiPropertyOptional() records?: AttendanceRowDto[];
}

export class InternalMarkDto {
  @ApiProperty() id: string;
  @ApiProperty() subjectId: string;
  @ApiPropertyOptional() subject?: { id: string; code: string; name: string; credit: number };
  @ApiPropertyOptional() examId?: string;
  @ApiPropertyOptional() exam?: { id: string; title: string; examType: string };
  @ApiProperty() marksObtained: number;
  @ApiProperty() maxMarks: number;
  @ApiProperty() attempt: number;
}

export class GpaResponseDto {
  @ApiProperty({ description: 'Semester GPA, null when no creditable marks yet' })
  gpa: number | null;
  @ApiProperty() semester: number;
  @ApiProperty() totalCredits: number;
  @ApiProperty() totalGradePoints: number;
  @ApiProperty() passedCredits: number;
  @ApiProperty() attemptedSubjects: number;
  @ApiProperty() passedSubjects: number;
  @ApiProperty({ type: () => Object, isArray: true }) breakdown: Array<Record<string, unknown>>;
}

export class CgpaResponseDto {
  @ApiProperty({ description: 'Cumulative GPA, null when no creditable marks yet' })
  cgpa: number | null;
  @ApiProperty() totalCredits: number;
  @ApiProperty() totalGradePoints: number;
  @ApiProperty() passedCredits: number;
  @ApiProperty() attemptedSubjects: number;
  @ApiProperty() passedSubjects: number;
  @ApiProperty({ type: () => Object, isArray: true }) breakdown: Array<Record<string, unknown>>;
}

export class AcademicCalendarQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: CALENDAR_EVENT_TYPES })
  @IsOptional()
  @IsEnum(CALENDAR_EVENT_TYPES)
  eventType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

export class AcademicCalendarEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() eventType: string;
  @ApiProperty() startAt: string;
  @ApiPropertyOptional() endAt?: string;
  @ApiProperty() allDay: boolean;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({ description: 'URL to the submitted file' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  attachmentUrl?: string;
}

// ---------------------------------------------------------------------------
// Faculty-facing /faculty/*
// ---------------------------------------------------------------------------

export class CreateSubjectDto {
  @ApiProperty({ example: 'CS301' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'Data Structures & Algorithms' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  credit?: number;

  @ApiProperty() @IsString() @IsNotEmpty() departmentId: string;

  @ApiProperty() @IsString() @IsNotEmpty() semesterId: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'CS301' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  credit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() semesterId?: string;
}

export class CreateMaterialDto {
  @ApiProperty({ example: 'Unit 1 Notes' }) @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @ApiProperty({ enum: MATERIAL_TYPES }) @IsEnum(MATERIAL_TYPES) type: string;
  @ApiProperty({ example: 'https://drive.example.com/notes.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MATERIAL_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) url?: string;
}

export class MarkAttendanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;

  @ApiProperty({ example: '2026-08-01' }) @IsDateString() sessionDate: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: { studentId: { type: 'string' }, status: { type: 'string' } },
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRow)
  records: AttendanceRow[];
}

export class AttendanceRow {
  @ApiProperty() @IsString() @IsNotEmpty() studentId: string;
  @ApiProperty({ enum: ATTENDANCE_STATUSES }) @IsEnum(ATTENDANCE_STATUSES) status: string;
}

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Assignment 1: Arrays' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
}

export class CreateExamDto {
  @ApiProperty({ example: 'Internal Test 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  @ApiPropertyOptional({ enum: EXAM_TYPES }) @IsOptional() @IsEnum(EXAM_TYPES) examType?: string;
  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateExamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EXAM_TYPES) examType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class BulkMarksRowDto {
  @ApiProperty() @IsString() @IsNotEmpty() studentId: string;
  @ApiProperty({ type: 'number' }) @Type(() => Number) @IsInt() @Min(0) marksObtained: number;
}

export class BulkMarksDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMarksRowDto)
  marks: BulkMarksRowDto[];
}

export class StudentAnalyticsDto {
  @ApiProperty() studentId: string;
  @ApiProperty() studentName: string;
  @ApiProperty() attendancePercentage: number | null;
  @ApiProperty() totalSessions: number;
  @ApiProperty() attendedSessions: number;
  @ApiProperty() gpa: number | null;
  @ApiProperty() totalCredits: number;
  @ApiProperty() passedCredits: number;
  @ApiProperty({ type: () => Object, isArray: true }) marks: InternalMarkDto[];
}

export class CreateQuestionDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000) question: string;
  @ApiPropertyOptional() @IsOptional() options?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) correctAnswer?: string;
  @ApiPropertyOptional({ enum: QUESTION_DIFFICULTIES })
  @IsOptional()
  @IsEnum(QUESTION_DIFFICULTIES)
  difficulty?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) marks?: number;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) question?: string;
  @ApiPropertyOptional() @IsOptional() options?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) correctAnswer?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(QUESTION_DIFFICULTIES) difficulty?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) marks?: number;
}

// ---------------------------------------------------------------------------
// College admin /admin/*
// ---------------------------------------------------------------------------

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Computer Science & Engineering' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'CSE' }) @IsString() @IsNotEmpty() @MaxLength(20) code: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class CreateSemesterDto {
  @ApiProperty({ example: 3 }) @Type(() => Number) @IsInt() @Min(1) @Max(16) number: number;
  @ApiProperty({ example: 'Semester III' }) @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @ApiPropertyOptional({ description: 'Credit scheme label, e.g. "2019" or "2023"' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  scheme?: string;
}

export class CreateAdminUserDto {
  @ApiProperty({ example: 'faculty@college.edu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'Dr. Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() isActive?: 0 | 1;
}

export class AcademicReportsQueryDto {
  @ApiPropertyOptional({ description: 'Filter report data to a department id' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter to a semester id' })
  @IsOptional()
  @IsString()
  semester?: string;
}
