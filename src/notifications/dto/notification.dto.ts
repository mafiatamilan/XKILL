import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

// ── Notification read DTOs ───────────────────────────────────────────────

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter to unread notifications only' })
  @IsOptional()
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

// ── Announcement DTOs ────────────────────────────────────────────────────

export const ANNOUNCEMENT_TYPES = ['general', 'academic', 'placement', 'event', 'urgent'] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Campus Drive: TCS visiting on 15th Aug' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'TCS is conducting a campus placement drive...' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_TYPES, default: 'general' })
  @IsOptional()
  @IsString()
  @IsIn(ANNOUNCEMENT_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_PRIORITIES, default: 'normal' })
  @IsOptional()
  @IsString()
  @IsIn(ANNOUNCEMENT_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({
    example: ['student', 'faculty'],
    description: 'Target roles; empty = all roles',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(ANNOUNCEMENT_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_PRIORITIES })
  @IsOptional()
  @IsString()
  @IsIn(ANNOUNCEMENT_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class AnnouncementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ANNOUNCEMENT_TYPES })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class AnnouncementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() authorId: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty() type: string;
  @ApiProperty() priority: string;
  @ApiProperty() targetRoles: string[];
  @ApiProperty() isPublished: boolean;
  @ApiPropertyOptional() publishedAt?: string;
  @ApiPropertyOptional() expiresAt?: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

// ── Template DTOs ────────────────────────────────────────────────────────

export const TEMPLATE_CHANNELS = ['in_app', 'email', 'push', 'sms'] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export class CreateTemplateDto {
  @ApiProperty({ example: 'welcome-email' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: TEMPLATE_CHANNELS })
  @IsString()
  @IsIn(TEMPLATE_CHANNELS)
  channel: string;

  @ApiProperty({ example: 'announcement' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ example: 'Welcome to XKILL!' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: '<h1>Welcome!</h1><p>...</p>' })
  @IsString()
  body: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_CHANNELS })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_CHANNELS)
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TemplateQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TEMPLATE_CHANNELS })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TemplateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() channel: string;
  @ApiProperty() eventType: string;
  @ApiPropertyOptional() subject?: string;
  @ApiProperty() body: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

// ── Broadcast DTOs ───────────────────────────────────────────────────────

export const BROADCAST_CHANNELS = ['in_app', 'email', 'push', 'sms'] as const;
export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];

export class BroadcastDto {
  @ApiProperty({ example: 'New semester schedule released' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '<p>The new semester starts on...</p>' })
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({ enum: BROADCAST_CHANNELS, default: 'in_app' })
  @IsString()
  @IsIn(BROADCAST_CHANNELS)
  channel: string;

  @ApiPropertyOptional({
    example: ['student', 'faculty'],
    description: 'Target roles; empty = all active users',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({ description: 'Template ID to use for rendering' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Announcement ID to associate' })
  @IsOptional()
  @IsString()
  announcementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BroadcastResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() templateId?: string;
  @ApiPropertyOptional() announcementId?: string;
  @ApiProperty() channel: string;
  @ApiProperty() targetUserIds: string[];
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
  @ApiProperty() status: string;
  @ApiProperty() totalRecipients: number;
  @ApiProperty() sentCount: number;
  @ApiProperty() failedCount: number;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class BroadcastQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'processing', 'completed', 'failed'] })
  @IsOptional()
  @IsString()
  status?: string;
}
