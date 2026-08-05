import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class IssueCertificateDto {
  @ApiProperty({ description: 'User ID to issue certificate to' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Template ID to use' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiProperty({ description: 'Certificate title', example: 'Advanced DSA Completion' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Expiration date', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Optional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class VerifyCertificateResponseDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  certificateNumber!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  recipientName!: string;

  @ApiProperty()
  issuedAt!: Date;

  @ApiProperty()
  expiresAt?: Date;

  @ApiProperty()
  isRevoked!: boolean;

  @ApiProperty()
  revokedAt?: Date;
}

export class CertificateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  certificateNumber!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  issuedAt!: Date;

  @ApiProperty()
  expiresAt?: Date;

  @ApiProperty()
  templateName!: string;

  @ApiProperty()
  verificationCode!: string;

  @ApiProperty()
  metadata?: Record<string, unknown>;
}
