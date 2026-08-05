import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class AwardXpDto {
  @ApiProperty({ description: 'User ID to award XP to' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Action type', example: 'problem_solved' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty({ description: 'XP amount', example: 50 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({
    description: 'Idempotency key to prevent double awards',
    example: 'prob_abc123_attempt_1',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({ description: 'Optional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class ClaimDailyRewardDto {
  @ApiProperty({
    description: 'Timezone for daily reward calculation',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class GamificationSummaryResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  totalXp!: number;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  levelTitle!: string;

  @ApiProperty()
  currentStreak!: number;

  @ApiProperty()
  longestStreak!: number;

  @ApiProperty()
  badgesEarned!: number;

  @ApiProperty()
  todayClaimed!: boolean;

  @ApiProperty()
  dailyRewardDay!: number;

  @ApiProperty({ type: [Object] })
  recentAchievements!: Array<{
    id: string;
    badgeName: string;
    badgeIcon: string | null;
    earnedAt: Date;
  }>;
}
