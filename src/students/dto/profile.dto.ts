import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export class UpsertProfileDto {
  @ApiPropertyOptional({ example: 'Aspiring SDE @ FAANG' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string;

  @ApiPropertyOptional({ example: 'CS undergrad passionate about distributed systems' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '2004-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 'https://leetcode.com/johndoe' })
  @IsOptional()
  @IsUrl()
  leetcodeUrl?: string;

  @ApiPropertyOptional({ example: 'https://codeforces.com/profile/johndoe' })
  @IsOptional()
  @IsUrl()
  codeforcesUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/resume.pdf' })
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'VJTI' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  collegeName?: string;

  @ApiPropertyOptional({ example: 'Computer Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentSemester?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  expectedGraduationYear?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isProfileVisible?: boolean;
}

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() headline?: string;
  @ApiPropertyOptional() bio?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() dateOfBirth?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() githubUrl?: string;
  @ApiPropertyOptional() linkedinUrl?: string;
  @ApiPropertyOptional() portfolioUrl?: string;
  @ApiPropertyOptional() leetcodeUrl?: string;
  @ApiPropertyOptional() codeforcesUrl?: string;
  @ApiPropertyOptional() resumeUrl?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() collegeName?: string;
  @ApiPropertyOptional() department?: string;
  @ApiPropertyOptional() currentSemester?: number;
  @ApiPropertyOptional() expectedGraduationYear?: number;
  @ApiProperty() isProfileVisible: boolean;
  @ApiProperty({ example: 42 }) completionPercent: number;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class CreateSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    example: 'programming',
    enum: ['programming', 'dsa', 'web', 'database', 'other'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({ enum: PROFICIENCY_LEVELS, default: 'intermediate' })
  @IsOptional()
  @IsEnum(PROFICIENCY_LEVELS)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateSkillDto {
  @ApiPropertyOptional({ example: 'TypeScript' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: 'programming' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({ enum: PROFICIENCY_LEVELS })
  @IsOptional()
  @IsEnum(PROFICIENCY_LEVELS)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SkillResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiProperty() category: string;
  @ApiProperty() proficiencyLevel: string;
  @ApiProperty() yearsOfExperience: number;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class CreateCareerGoalDto {
  @ApiProperty({ example: 'Become a backend engineer at a top startup' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Backend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetRole?: string;

  @ApiPropertyOptional({ example: ['Google', 'Flipkart'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCompanies?: string[];

  @ApiPropertyOptional({ example: ['Software', 'Fintech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({ example: ['Mumbai', 'Remote'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetCtcLakhs?: number;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  targetDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'achieved', 'archived'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'achieved', 'archived'])
  status?: 'active' | 'achieved' | 'archived';

  @ApiPropertyOptional({ example: 'Focus on DSA and system design' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCareerGoalDto {
  @ApiPropertyOptional({ example: 'Become a staff engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Staff Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetRole?: string;

  @ApiPropertyOptional({ example: ['Google'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCompanies?: string[];

  @ApiPropertyOptional({ example: ['Software'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({ example: ['Remote'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetCtcLakhs?: number;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional()
  @IsISO8601()
  targetDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'achieved', 'archived'] })
  @IsOptional()
  @IsEnum(['active', 'achieved', 'archived'])
  status?: 'active' | 'achieved' | 'archived';

  @ApiPropertyOptional({ example: 'Focus on leadership' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CareerGoalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() targetRole?: string;
  @ApiProperty() targetCompanies: string[];
  @ApiProperty() industries: string[];
  @ApiProperty() preferredLocations: string[];
  @ApiPropertyOptional() targetCtcLakhs?: number;
  @ApiPropertyOptional() targetDate?: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
