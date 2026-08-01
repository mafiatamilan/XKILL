import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token issued at login/refresh' })
  @IsString()
  @MaxLength(512)
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'The refresh token of the session to close' })
  @IsString()
  @MaxLength(512)
  refreshToken: string;
}
