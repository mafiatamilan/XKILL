import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Password1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must be at least 8 characters and contain both letters and numbers',
  })
  password: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName: string;
}
