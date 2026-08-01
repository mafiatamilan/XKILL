import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiProperty() role: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() twoFactorEnabled: boolean;
  @ApiProperty() createdAt: string;

  static fromEntity(
    user: User & { role: { name: string } },
    twoFactorEnabled: boolean,
  ): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.avatarUrl = user.avatarUrl ?? undefined;
    dto.role = user.role.name;
    dto.isActive = user.isActive;
    dto.emailVerified = user.emailVerifiedAt !== null;
    dto.twoFactorEnabled = twoFactorEnabled;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType: 'Bearer';
  @ApiProperty({ description: 'Access token lifetime in seconds' }) accessTokenExpiresIn: number;
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
}

export class RegisterResponseDto {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ example: 'Verification email sent' }) message: string;
  @ApiProperty({ description: 'False once the email has been verified' })
  verificationRequired: boolean;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'Base32 TOTP secret for authenticator apps' }) secret: string;
  @ApiProperty({ description: 'otpauth:// provisioning URI' }) otpauthUrl: string;
  @ApiProperty({ description: 'QR code as a data: URL' }) qrCodeDataUrl: string;
}

export class TwoFactorEnabledResponseDto {
  @ApiProperty({ example: true }) enabled: boolean;
}

export class MessageResponseDto {
  @ApiProperty() message: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({ example: true }) verified: boolean;
}
