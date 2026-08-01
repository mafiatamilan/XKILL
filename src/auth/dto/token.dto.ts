import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_PATTERN } from './register.dto';

export class EmailDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token from the reset email' })
  @IsString()
  @MaxLength(512)
  token: string;

  @ApiProperty({ example: 'NewPassword1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must be at least 8 characters and contain both letters and numbers',
  })
  newPassword: string;
}

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'totpCode must be a 6-digit code' })
  totpCode: string;
}
