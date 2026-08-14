import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

class AssessmentSection {
  @IsString()
  name!: string;

  @IsNumber()
  count!: number;
}

// ---------- CompanyPrepPath ----------

export class CreateCompanyPrepPathDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://careers.google.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'Mountain View, CA' })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({ example: 4.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  GlassdoorRating?: number;
}

export class UpdateCompanyPrepPathDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  GlassdoorRating?: number;
}

// ---------- HiringPattern ----------

export class CreateHiringPatternDto {
  @ApiProperty({ example: 'Technical Interview 1' })
  @IsString()
  @IsNotEmpty()
  roundName!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  roundOrder!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEliminating?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tips?: string;
}

export class UpdateHiringPatternDto extends CreateHiringPatternDto {}

// ---------- InterviewQuestion ----------

export class CreateInterviewQuestionDto {
  @ApiProperty({ example: 'Explain the difference between TCP and UDP.' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ enum: ['technical', 'behavioral', 'system-design', 'dsa', 'hr'] })
  @IsEnum(['technical', 'behavioral', 'system-design', 'dsa', 'hr'])
  category!: string;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'], default: 'medium' })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional({ enum: ['very-common', 'common', 'occasional'] })
  @IsOptional()
  @IsEnum(['very-common', 'common', 'occasional'])
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tips?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sampleAnswer?: string;
}

export class UpdateInterviewQuestionDto extends CreateInterviewQuestionDto {}

// ---------- OnlineAssessment ----------

export class CreateOnlineAssessmentDto {
  @ApiPropertyOptional({ example: 'HackerRank' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  totalQuestions?: number;

  @ApiPropertyOptional({
    example: [
      { name: 'MCQ', count: 10 },
      { name: 'Coding', count: 2 },
    ],
  })
  @IsOptional()
  sections?: AssessmentSection[];

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'], default: 'medium' })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional({ example: ['dsa', 'os', 'cn', 'sql'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tips?: string;
}

export class UpdateOnlineAssessmentDto extends CreateOnlineAssessmentDto {}

// ---------- SalaryInsight ----------

export class CreateSalaryInsightDto {
  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty({ example: 'fresher' })
  @IsEnum(['fresher', '1-3y', '3-5y', '5-10y', '10+y'])
  experienceLevel!: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  ctcMin!: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  ctcMax!: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  ctcMedian?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  baseMin?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  baseMax?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  stockComponent?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  bonusComponent?: number;

  @ApiPropertyOptional({ example: 'glassdoor' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateSalaryInsightDto extends CreateSalaryInsightDto {}

// ---------- PrepTimeline ----------

export class CreatePrepTimelineDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  weekNumber!: number;

  @ApiProperty({ example: 'Week 1: DSA Foundations' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['Solve 5 DSA problems daily', 'Read system design blog'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tasks?: string[];

  @ApiPropertyOptional({ example: ['dsa', 'system-design'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];
}

export class UpdatePrepTimelineDto extends CreatePrepTimelineDto {}
