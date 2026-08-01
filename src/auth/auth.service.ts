import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { AppConfigService } from '../config/app-config.service';
import { MailService } from '../mailer/mailer.service';
import { AuthRepository, DeviceInput, UserWithRole } from './auth.repository';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { AuthResponseDto, RegisterResponseDto, UserResponseDto } from './dto/auth-response.dto';

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly twoFactor: TwoFactorService,
    private readonly mailer: MailService,
    private readonly config: AppConfigService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<RegisterResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const defaultRole = await this.repository.findRoleByName(this.config.get().defaultRole);
    if (!defaultRole) {
      throw new Error(`Default role '${this.config.get().defaultRole}' is not seeded`);
    }

    const user = await this.repository.createUser({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
      roleId: defaultRole.id,
    });

    await this.issueVerificationEmail(user);
    const twoFactor = await this.repository.findTwoFactor(user.id);
    return {
      user: UserResponseDto.fromEntity(user, twoFactor?.isEnabled ?? false),
      message: 'Registration successful. A verification email has been sent.',
      verificationRequired: true,
    };
  }

  async login(
    dto: { email: string; password: string; totpCode?: string; device?: DeviceInput },
    ctx: LoginContext,
  ): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: 'This account has been suspended',
      });
    }
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in',
      });
    }

    const twoFactor = await this.repository.findTwoFactor(user.id);
    if (twoFactor?.isEnabled) {
      if (!dto.totpCode) {
        throw new BadRequestException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'A TOTP code is required',
        });
      }
      if (!(await this.twoFactor.verifyCode(user.id, dto.totpCode))) {
        throw new UnauthorizedException({
          code: 'INVALID_TOTP',
          message: 'The TOTP code is invalid',
        });
      }
    }

    const { accessToken, refreshToken } = await this.createSession(user, dto.device, ctx);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.tokens.accessTokenExpirySeconds(),
      user: UserResponseDto.fromEntity(user, twoFactor?.isEnabled ?? false),
    };
  }

  async refresh(refreshToken: string, ctx: LoginContext): Promise<AuthResponseDto> {
    const hash = this.tokens.hashToken(refreshToken);
    const session = await this.repository.findSessionByTokenHash(hash);
    if (!session || session.revokedAt !== null || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'The refresh token is invalid or has expired',
      });
    }
    if (!session.user.isActive) {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: 'This account has been suspended',
      });
    }

    const newRaw = this.tokens.generateRefreshToken();
    const newHash = this.tokens.hashToken(newRaw);
    const now = new Date();
    const rotated = await this.repository.rotateSession(
      session.id,
      hash,
      newHash,
      now,
      this.refreshExpiry(),
    );
    if (!rotated) {
      throw new ConflictException({
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
        message:
          'This refresh token has already been used; all sessions for this account have been revoked',
      });
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role.name,
      sid: session.id,
    });
    const twoFactor = await this.repository.findTwoFactor(session.user.id);
    void ctx;
    return {
      accessToken,
      refreshToken: newRaw,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.tokens.accessTokenExpirySeconds(),
      user: UserResponseDto.fromEntity(session.user, twoFactor?.isEnabled ?? false),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.tokens.hashToken(refreshToken);
    await this.repository.revokeSessionByHash(hash, new Date());
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const hash = this.tokens.hashToken(token);
    const record = await this.repository.findVerificationTokenByHash(hash);
    if (!record || record.usedAt !== null || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'The verification link is invalid or has expired',
      });
    }
    await this.repository.consumeVerificationToken(record.id, record.userId, new Date());
    return { verified: true };
  }

  async resendVerificationEmail(email: string): Promise<{ sent: boolean }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.repository.findByEmail(normalized);
    if (!user || user.emailVerifiedAt) {
      return { sent: true };
    }
    await this.repository.invalidateVerificationTokens(user.id, new Date());
    await this.issueVerificationEmail(user);
    return { sent: true };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.repository.findByEmail(normalized);
    if (!user) {
      return { sent: true };
    }
    const token = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.repository.createPasswordResetToken({
      userId: user.id,
      tokenHash: this.tokens.hashToken(token),
      expiresAt,
    });
    const link = `${this.config.get().webAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your XKILL password',
      template: 'password-reset',
      html: `Hello ${user.fullName},<br/>Click <a href="${link}">here</a> to reset your password. The link expires in 1 hour.`,
      data: { resetUrl: link },
    });
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const hash = this.tokens.hashToken(token);
    const record = await this.repository.findPasswordResetTokenByHash(hash);
    if (!record || record.usedAt !== null || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'The reset link is invalid or has expired',
      });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repository.setUserPassword(record.userId, passwordHash);
    await this.repository.markResetTokenUsed(record.id, new Date());
    await this.repository.revokeAllUserSessions(record.userId, new Date());
    return { reset: true };
  }

  async createSession(
    user: UserWithRole,
    device?: DeviceInput,
    ctx?: LoginContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const deviceId = await this.repository.upsertDevice(user.id, device ?? {});
    const refreshToken = this.tokens.generateRefreshToken();
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: this.tokens.hashToken(refreshToken),
      deviceId,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      expiresAt: this.refreshExpiry(),
    });
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      sid: session.id,
    });
    return { accessToken, refreshToken };
  }

  private async issueVerificationEmail(user: {
    id: string;
    email: string;
    fullName: string;
  }): Promise<void> {
    const token = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repository.createVerificationToken({
      userId: user.id,
      tokenHash: this.tokens.hashToken(token),
      expiresAt,
    });
    const link = `${this.config.get().webAppUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Verify your XKILL account',
      template: 'email-verification',
      html: `Hello ${user.fullName},<br/>Click <a href="${link}">here</a> to verify your email. The link expires in 24 hours.`,
      data: { verifyUrl: link },
    });
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.config.get().jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  }
}

export function randomPasswordHashPlaceholder(): string {
  return `unset-${randomBytes(24).toString('hex')}`;
}
