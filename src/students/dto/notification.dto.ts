import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export const NOTIFICATION_TYPES = [
  'system',
  'announcement',
  'academic',
  'placement',
  'job',
  'mentor',
  'general',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only unread notifications when true' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
  @ApiProperty() isRead: boolean;
  @ApiPropertyOptional() readAt?: string;
  @ApiProperty() createdAt: string;
}

export class ReadinessScoreResponseDto {
  @ApiProperty({ example: 72 }) overall: number;
  @ApiProperty({
    example: { profile: 80, skills: 70, careerGoal: 90, activity: 40 },
  })
  components: {
    profile: number;
    skills: number;
    careerGoal: number;
    activity: number;
  };
  @ApiProperty() calculatedAt: string;
}

export class DashboardResponseDto {
  @ApiPropertyOptional({ type: () => ReadinessScoreResponseDto })
  readinessScore?: ReadinessScoreResponseDto;

  @ApiProperty({ example: 3 }) unreadNotifications: number;

  @ApiProperty({ type: [Object] }) upcomingEvents: Array<Record<string, unknown>>;

  @ApiProperty({ type: [Object] }) recentActivity: Array<Record<string, unknown>>;

  @ApiProperty({ example: 1 }) activeGoals: number;

  @ApiProperty({ example: 0 }) skillsCount: number;

  @ApiProperty({ example: 42 }) profileCompletionPercent: number;
}

export class ActivityLogResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
  @ApiProperty() createdAt: string;
}
