import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceDto {
  @ApiPropertyOptional({ example: "Ada's MacBook" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'macos' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  platform?: string;

  @ApiPropertyOptional({ example: 'Chrome' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  browser?: string;

  @ApiPropertyOptional({ example: 'macOS 14' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  os?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Password1' })
  @IsString()
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'TOTP code, required when 2FA is enabled',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'totpCode must be a 6-digit code' })
  totpCode?: string;

  @ApiPropertyOptional({ type: DeviceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceDto)
  device?: DeviceDto;
}
