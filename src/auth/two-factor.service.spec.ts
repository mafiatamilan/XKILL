import { ConflictException, ForbiddenException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { AuthRepository } from './auth.repository';
import { TwoFactorService } from './two-factor.service';
import { mockConfig } from '../testing/mocks';

jest.mock('qrcode');

describe('TwoFactorService', () => {
  let repository: jest.Mocked<Pick<AuthRepository, keyof AuthRepository>>;
  let service: TwoFactorService;

  beforeEach(() => {
    repository = {
      findTwoFactor: jest.fn(),
      saveTwoFactorSecret: jest.fn(),
      enableTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,xxxx');
    service = new TwoFactorService(repository as unknown as AuthRepository, mockConfig());
  });

  describe('setup', () => {
    it('generates a secret, otpauth URL and QR code', async () => {
      repository.findTwoFactor.mockResolvedValue(null);
      const result = await service.setup('u1', 'a@b.com');
      expect(result.secret).toBeTruthy();
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.qrCodeDataUrl).toBe('data:image/png;base64,xxxx');
      expect(repository.saveTwoFactorSecret).toHaveBeenCalledWith('u1', result.secret);
    });

    it('throws when 2FA is already enabled', async () => {
      repository.findTwoFactor.mockResolvedValue({ isEnabled: true, secret: 'x' } as any);
      await expect(service.setup('u1', 'a@b.com')).rejects.toMatchObject({
        response: { code: 'TWO_FACTOR_ALREADY_ENABLED' },
      });
    });
  });

  describe('verifyCode', () => {
    it('verifies a code against the stored secret', async () => {
      const secret = authenticator.generateSecret();
      repository.findTwoFactor.mockResolvedValue({ isEnabled: false, secret } as any);
      const good = authenticator.generate(secret);
      await expect(service.verifyCode('u1', good)).resolves.toBe(true);
      await expect(service.verifyCode('u1', '000000')).resolves.toBe(false);
    });

    it('throws when 2FA was never set up', async () => {
      repository.findTwoFactor.mockResolvedValue(null);
      await expect(service.verifyCode('u1', '123456')).rejects.toMatchObject({
        response: { code: 'TWO_FACTOR_NOT_SETUP' },
      });
    });
  });

  describe('enable / disable', () => {
    it('enables 2FA after verifying the code', async () => {
      const secret = authenticator.generateSecret();
      repository.findTwoFactor.mockResolvedValue({ isEnabled: false, secret } as any);
      await service.enable('u1', authenticator.generate(secret));
      expect(repository.enableTwoFactor).toHaveBeenCalledWith('u1', expect.any(Date));
    });

    it('rejects enabling with a wrong code', async () => {
      repository.findTwoFactor.mockResolvedValue({
        isEnabled: false,
        secret: authenticator.generateSecret(),
      } as any);
      await expect(service.enable('u1', '111111')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('disables 2FA after verifying the code', async () => {
      const secret = authenticator.generateSecret();
      repository.findTwoFactor.mockResolvedValue({ isEnabled: true, secret } as any);
      await service.disable('u1', authenticator.generate(secret));
      expect(repository.disableTwoFactor).toHaveBeenCalledWith('u1', expect.any(Date));
    });

    it('throws when 2FA is not enabled', async () => {
      repository.findTwoFactor.mockResolvedValue({ isEnabled: false, secret: 'x' } as any);
      await expect(service.disable('u1', '123456')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when no 2FA record exists at all', async () => {
      repository.findTwoFactor.mockResolvedValue(null);
      await expect(service.disable('u1', '123456')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
