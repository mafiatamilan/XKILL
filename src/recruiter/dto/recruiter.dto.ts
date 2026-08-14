import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

// ---------- RecruiterProfile ----------

export class CreateRecruiterProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: 'Senior Technical Recruiter' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}

export class UpdateRecruiterProfileDto extends CreateRecruiterProfileDto {}

// ---------- Shortlist ----------

export class CreateShortlistDto {
  @ApiPropertyOptional({ example: 'job-uuid' })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateShortlistStatusDto {
  @ApiProperty({ enum: ['shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn'] })
  @IsEnum(['shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn'])
  status!: string;
}

// ---------- InterviewSchedule ----------

export class CreateInterviewScheduleDto {
  @ApiProperty({ description: 'Candidate user ID' })
  @IsString()
  @IsNotEmpty()
  candidateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ['onsite', 'virtual', 'phone'], default: 'onsite' })
  @IsOptional()
  @IsEnum(['onsite', 'virtual', 'phone'])
  type?: string;
}

export class UpdateInterviewScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['onsite', 'virtual', 'phone'])
  type?: string;

  @ApiPropertyOptional({ enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  @IsOptional()
  @IsEnum(['scheduled', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}
