import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ example: 'Violation of academic integrity policy' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'hiring_manager' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'Hiring managers can review candidates' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: ['read:candidates', 'update:applications'],
    description: 'Permission names to grant. `manage:all` grants everything.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'hiring_manager' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Replaces the full permission set when provided' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() isSystem: boolean;
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

// ── Feature Flags ──

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'new-dashboard' })
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'New Dashboard UI' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Enables the redesigned dashboard' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: 100, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPct?: number;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPct?: number;
}

// ── System Settings ──

export class UpsertSystemSettingDto {
  @ApiProperty({ example: 'maintenance_mode' })
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'true' })
  @IsString()
  @MaxLength(2000)
  value!: string;

  @ApiPropertyOptional({ example: 'maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'Enables maintenance mode' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// ── Audit Logs Query ──

export class AuditLogQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;
}

// ── API Usage Query ──

export class ApiUsageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
