import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const EVENT_TYPES = [
  'interview',
  'study',
  'exam',
  'placement',
  'personal',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export class CreateCalendarEventDto {
  @ApiProperty({ example: 'Mock interview with Google' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Prepare for system design round' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: EVENT_TYPES, default: 'personal' })
  @IsOptional()
  @IsEnum(EVENT_TYPES)
  eventType?: EventType;

  @ApiProperty({ example: '2026-08-10T09:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiPropertyOptional({ example: '2026-08-10T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional({ example: 'Google Meet' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: '2026-08-10T08:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  reminderAt?: string;
}

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ example: 'Mock interview with Google' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: EVENT_TYPES })
  @IsOptional()
  @IsEnum(EVENT_TYPES)
  eventType?: EventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  reminderAt?: string;
}

export class CalendarEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() eventType: string;
  @ApiProperty() startAt: string;
  @ApiPropertyOptional() endAt?: string;
  @ApiPropertyOptional() location?: string;
  @ApiProperty() isAllDay: boolean;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() reminderAt?: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'], default: 'light' })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({ enum: ['public', 'recruiters_only', 'private'], default: 'public' })
  @IsOptional()
  @IsIn(['public', 'recruiters_only', 'private'])
  profileVisibility?: 'public' | 'recruiters_only' | 'private';
}

export class SettingsResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() emailNotifications: boolean;
  @ApiProperty() pushNotifications: boolean;
  @ApiProperty() smsNotifications: boolean;
  @ApiProperty() weeklyDigest: boolean;
  @ApiProperty() language: string;
  @ApiProperty() theme: string;
  @ApiProperty() profileVisibility: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
