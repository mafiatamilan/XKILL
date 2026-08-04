import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class CreatePracticeBattleDto {
  @ApiPropertyOptional({
    description: 'Battle duration in seconds (min 60, default 900)',
    default: 900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  durationSeconds?: number;
}

export class CreatePrivateBattleDto {
  @ApiPropertyOptional({
    description: 'Battle duration in seconds (min 60, default 900)',
    default: 900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  durationSeconds?: number;
}

export class JoinPrivateBattleDto {
  @ApiProperty({ description: '6-character invite code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  inviteCode!: string;
}

export class SubmitBattleCodeDto {
  @ApiProperty({ description: 'Problem id from the battle' })
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @ApiProperty({ description: 'Judge0 language id', example: 71 })
  @Type(() => Number)
  @IsInt()
  languageId!: number;

  @ApiProperty({ description: 'Source code to submit' })
  @IsString()
  @IsNotEmpty()
  sourceCode!: string;
}

export class BattleHistoryQueryDto extends PaginationQueryDto {}
