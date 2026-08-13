import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateMentorProfileDto {
  @ApiProperty({ example: 'Senior SDE at Google' })
  @IsString()
  @IsNotEmpty()
  headline!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: ['system-design', 'dsa', 'react'] })
  @IsArray()
  @IsString({ each: true })
  expertise!: string[];

  @ApiProperty({ example: 500, description: 'Hourly rate in INR' })
  @IsNumber()
  @Min(0)
  hourlyRate!: number;
}

export class UpdateMentorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertise?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class CreateAvailabilityDto {
  @ApiProperty({ enum: [0, 1, 2, 3, 4, 5, 6] })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @IsNotEmpty()
  endTime!: string;
}

export class BookMentorDto {
  @ApiProperty({ description: 'Availability slot ID' })
  @IsString()
  @IsNotEmpty()
  availabilityId!: string;

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({ example: 'System Design Review' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayBookingDto {
  @ApiProperty({ example: 'pay_abc123' })
  @IsString()
  @IsNotEmpty()
  paymentId!: string;
}

export class ReviewMentorDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class MentorSearchQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by expertise' })
  @IsOptional()
  @IsString()
  expertise?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
