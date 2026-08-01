import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

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
