/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';

// ── Lab Subject ──

export class CreateLabSubjectDto {
  @ApiProperty({ example: 'Programming Lab 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'CSL101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(8)
  semester!: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(10)
  credits!: number;

  @ApiPropertyOptional({ example: 'c' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;
}

export class UpdateLabSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  semester?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  credits?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;
}

// ── Lab Experiment ──

export class CreateLabExperimentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  weekNumber!: number;

  @ApiProperty({ example: 'Arrays and Pointers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Learn to implement dynamic arrays using pointers.' })
  @IsString()
  @IsNotEmpty()
  objective!: string;

  @ApiPropertyOptional({ example: 'Arrays are contiguous memory blocks...' })
  @IsOptional()
  @IsString()
  theory?: string;

  @ApiProperty({ example: 'Implement a function that reverses an array in-place.' })
  @IsString()
  @IsNotEmpty()
  problemStatement!: string;

  @ApiPropertyOptional({ example: '1 2 3 4 5' })
  @IsOptional()
  @IsString()
  sampleInput?: string;

  @ApiPropertyOptional({ example: '5 4 3 2 1' })
  @IsOptional()
  @IsString()
  sampleOutput?: string;

  @ApiPropertyOptional({ example: '1 <= n <= 1000' })
  @IsOptional()
  @IsString()
  constraints?: string;

  @ApiPropertyOptional({ example: '// Write your code here' })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class UpdateLabExperimentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  weekNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  theory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problemStatement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sampleInput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sampleOutput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  constraints?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

// ── Lab Submission ──

export class SubmitExperimentDto {
  @ApiProperty({ example: '#include <stdio.h>\nint main() { ... }' })
  @IsString()
  @IsNotEmpty()
  sourceCode!: string;

  @ApiProperty({ example: 'c' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

// ── Programming Assignment ──

export class CreateProgrammingAssignmentDto {
  @ApiProperty({ example: 'Implement a Linked List' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'Implement a singly linked list with insert, delete, and search operations.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  datasetUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;
}

// ── Practical Exam ──

export class CreatePracticalExamDto {
  @ApiProperty({ example: 'Midterm Practical' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startTime!: string;

  @ApiProperty()
  @IsDateString()
  endTime!: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(30)
  @Max(360)
  durationMinutes!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount!: number;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  difficulty?: string;

  @ApiPropertyOptional({ example: 'c' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  securityConfig?: Record<string, any>;
}

// ── Viva ──

export class CreateVivaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examinerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  questionBank?: Array<{ question: string; maxMarks: number }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  marksObtained?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  attendance?: boolean;
}

// ── Mini Project ──

export class CreateMiniProjectDto {
  @ApiProperty({ example: 'Library Management System' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abstract?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problemStatement?: string;

  @ApiPropertyOptional({ example: ['Node.js', 'React', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stack?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repoLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  demoVideoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  docsUrl?: string;
}

// ── Attendance ──

export class MarkAttendanceDto {
  @ApiProperty({ example: 'lab_login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

// ── AI ──

export class AiReviewDto {
  @ApiProperty({ example: 'int main() { ... }' })
  @IsString()
  @IsNotEmpty()
  sourceCode!: string;

  @ApiProperty({ example: 'c' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language!: string;
}

export class AiAssistantDto {
  @ApiProperty({ example: 'explain' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  task!: string; // explain | find_bug | generate_tests | explain_error | convert_language | explain_sql

  @ApiProperty({ example: 'int main() { printf("%d", 1/0); }' })
  @IsString()
  @IsNotEmpty()
  sourceCode!: string;

  @ApiProperty({ example: 'c' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language!: string;

  @ApiPropertyOptional({ example: 'Division by zero error at line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;
}

// ── OBE ──

export class CreateCourseOutcomeDto {
  @ApiProperty({ example: 'CO1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code!: string;

  @ApiProperty({ example: 'Understand basic data structures and their applications.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class CreateProgramOutcomeDto {
  @ApiProperty({ example: 'PO1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code!: string;

  @ApiProperty({ example: 'Apply knowledge of mathematics, science, and engineering.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class CreateCoPoMappingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  coId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  poId!: string;

  @ApiProperty({ example: 2, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  attainmentLevel!: number;
}

// ── Pagination ──

export class LabPaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
