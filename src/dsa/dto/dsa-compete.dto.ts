import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class ContestStatusQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['draft', 'published', 'ongoing', 'finished', 'cancelled'],
    description: 'Filter contests by status',
  })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published', 'ongoing', 'finished', 'cancelled'])
  status?: string;
}

export class CreateContestProblemDto {
  @ApiProperty({ description: 'Problem id from the DSA catalog' })
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @ApiPropertyOptional({ description: 'Points awarded for solving this problem', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  basePoints?: number;
}

export class CreateContestDto {
  @ApiProperty({ example: 'weekly-contest-42' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'Weekly Contest 42' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'ISO-8601 start time', example: '2026-08-10T10:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'ISO-8601 end time', example: '2026-08-10T12:00:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Affects the rating of participants when the contest finishes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  @ApiPropertyOptional({
    description: 'Problems to attach to the contest (faculty-selected from the catalog)',
    type: [CreateContestProblemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContestProblemDto)
  problems?: CreateContestProblemDto[];
}

export class UpdateContestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rules?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Full replacement problem list (order + basePoints honoured)',
    type: [CreateContestProblemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContestProblemDto)
  problems?: CreateContestProblemDto[];
}

export class AntiCheatEventDto {
  @ApiProperty({ enum: ['dsa-contest', 'coding-battle', 'practical-exam'] })
  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @ApiProperty({ description: 'Contest / battle / exam id this event belongs to' })
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @ApiProperty({
    enum: ['tab-switch', 'copy-paste', 'focus-out', 'suspicious-submission'],
  })
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @ApiPropertyOptional({ description: 'Arbitrary JSON detail about the event' })
  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;
}

export class LeaderboardQueryDto extends PaginationQueryDto {}
