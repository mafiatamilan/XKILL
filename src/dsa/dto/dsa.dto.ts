import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const VERDICTS = [
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'runtime_error',
  'compilation_error',
] as const;

export class ListProblemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DIFFICULTIES })
  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by topic, e.g. arrays, dp, graphs' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Filter by company, e.g. Google' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Filter by tag, e.g. two-pointers' })
  @IsOptional()
  @IsString()
  tag?: string;
}

export class ListSubmissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by problem id' })
  @IsOptional()
  @IsString()
  problemId?: string;

  @ApiPropertyOptional({ enum: VERDICTS })
  @IsOptional()
  @IsIn(VERDICTS)
  verdict?: string;
}

export class RunCodeDto {
  @ApiProperty({ description: 'Judge0 language id, e.g. 71 for Python 3' })
  @IsInt()
  @Min(0)
  languageId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  sourceCode!: string;

  @ApiPropertyOptional({ description: 'Custom stdin to run the program against' })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  stdin?: string;
}

export class SubmitCodeDto {
  @ApiProperty({ description: 'Judge0 language id, e.g. 71 for Python 3' })
  @IsInt()
  @Min(0)
  languageId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  sourceCode!: string;
}

export class UnlockHintDto {
  @ApiProperty({ description: '1-based hint order to unlock', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  hintOrder!: number;
}
