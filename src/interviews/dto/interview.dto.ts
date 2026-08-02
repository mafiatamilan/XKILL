import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';
import { INTERVIEW_TYPES } from '../interview-ai';

export class CreateInterviewSessionDto {
  @ApiProperty({
    enum: INTERVIEW_TYPES,
    description: 'Interview type — changes what context is fed to the AI',
    example: 'technical',
  })
  @IsString()
  @IsIn(INTERVIEW_TYPES)
  type!: string;

  @ApiPropertyOptional({
    description:
      'Interaction mode. Only `text` is implemented; voice/video return 501 MODE_NOT_AVAILABLE.',
    default: 'text',
    example: 'text',
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description:
      'Required for `type: dsa`. Links the interview to a real problem from the DSA catalog, whose hidden test cases grade any code the candidate submits.',
  })
  @IsOptional()
  @IsString()
  problemId?: string;
}

export class AddInterviewTurnDto {
  @ApiProperty({ description: "The candidate's answer to the current question" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  answer!: string;

  @ApiPropertyOptional({
    description:
      'Candidate source code. Only accepted for `type: dsa` sessions; graded against the linked problem.',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Judge0 language id, required when `code` is provided' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  languageId?: number;
}

export class InterviewListQueryDto extends PaginationQueryDto {}
