import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceInfoDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() platform?: string;
  @ApiPropertyOptional() browser?: string;
  @ApiPropertyOptional() os?: string;
}

export class SessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: DeviceInfoDto }) device: DeviceInfoDto;
  @ApiPropertyOptional() ip?: string;
  @ApiPropertyOptional() userAgent?: string;
  @ApiProperty() issuedAt: string;
  @ApiProperty() lastUsedAt: string;
  @ApiProperty() expiresAt: string;
  @ApiProperty({ description: 'True when this session issued the current access token' })
  current: boolean;
}
