import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

// ---------- CompanyDrive ----------

export class CreateCompanyDriveDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 'Google Campus Drive 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['SDE', 'Data Analyst'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 18.5 })
  @IsOptional()
  @IsNumber()
  packageLakhs?: number;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  deadline!: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsDateString()
  driveDate?: string;
}

export class UpdateCompanyDriveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  packageLakhs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  driveDate?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['upcoming', 'ongoing', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ---------- EligibilityCriteria ----------

export class CreateEligibilityCriteriaDto {
  @ApiPropertyOptional({ example: 'CS' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 7.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  minCgpa?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPercentage?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  backlogsAllowed?: number;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  passingYear?: string;

  @ApiPropertyOptional({ example: ['React', 'Node.js'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------- OfferRecord ----------

export class CreateOfferRecordDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty({ example: 18.5 })
  @IsNumber()
  @Min(0)
  ctcLakhs!: number;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOfferRecordDto {
  @ApiPropertyOptional({ enum: ['offered', 'accepted', 'rejected', 'joined', 'declined'] })
  @IsOptional()
  @IsEnum(['offered', 'accepted', 'rejected', 'joined', 'declined'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------- TpoInterviewSchedule ----------

export class CreateTpoInterviewDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  @IsNotEmpty()
  candidateId!: string;

  @ApiProperty({ example: '2026-08-25T10:00:00.000Z' })
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

  @ApiPropertyOptional({ example: ['Prof. Sharma', 'Mr. Kumar'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  panelMembers?: string[];
}

export class UpdateTpoInterviewDto {
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

// ---------- PlacementReport ----------

export class CreatePlacementReportDto {
  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @IsNotEmpty()
  academicYear!: string;

  @ApiPropertyOptional({ example: 'CS' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  totalStudents!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  eligibleStudents!: number;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  placedStudents!: number;

  @ApiProperty({ example: 110 })
  @IsNumber()
  @Min(0)
  offersMade!: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  highestPackage?: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  averagePackage?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  medianPackage?: number;

  @ApiPropertyOptional({ example: ['Google', 'Microsoft', 'Amazon'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topRecruiters?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
