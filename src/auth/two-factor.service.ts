import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { AppConfigService } from '../config/app-config.service';
import { AuthRepository } from './auth.repository';

authenticator.options = { step: 30, window: 1 };

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: AppConfigService,
  ) {}

  async setup(
    userId: string,
    email: string,
  ): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  }> {
    const existing = await this.repository.findTwoFactor(userId);
    if (existing?.isEnabled) {
      throw new ConflictException({
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: '2FA is already enabled',
      });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, this.config.get().twoFactorIssuer, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    await this.repository.saveTwoFactorSecret(userId, secret);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const record = await this.repository.findTwoFactor(userId);
    if (!record) {
      throw new ForbiddenException({
        code: 'TWO_FACTOR_NOT_SETUP',
        message: '2FA has not been set up',
      });
    }
    return authenticator.verify({ token: code, secret: record.secret });
  }

  async enable(userId: string, code: string): Promise<void> {
    if (!(await this.verifyCode(userId, code))) {
      throw new ForbiddenException({
        code: 'INVALID_TOTP',
        message: 'The provided TOTP code is invalid',
      });
    }
    await this.repository.enableTwoFactor(userId, new Date());
  }

  async disable(userId: string, code: string): Promise<void> {
    const record = await this.repository.findTwoFactor(userId);
    if (!record?.isEnabled) {
      throw new ConflictException({
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: '2FA is not enabled',
      });
    }
    if (!(await this.verifyCode(userId, code))) {
      throw new ForbiddenException({
        code: 'INVALID_TOTP',
        message: 'The provided TOTP code is invalid',
      });
    }
    await this.repository.disableTwoFactor(userId, new Date());
  }
}
