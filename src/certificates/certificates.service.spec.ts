import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: {
    user: Record<string, jest.Mock>;
    certificateTemplate: Record<string, jest.Mock>;
    certificate: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      certificateTemplate: { findUnique: jest.fn() },
      certificate: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CertificatesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CertificatesService);
  });

  describe('issueCertificate', () => {
    it('issues a certificate with unique number', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', fullName: 'Alice' });
      prisma.certificateTemplate.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Course Completion',
      });
      prisma.certificate.count.mockResolvedValue(0);
      prisma.certificate.create.mockResolvedValue({
        id: 'cert1',
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA Completion',
        issuedAt: new Date(),
        expiresAt: null,
        verificationCode: 'abc123',
        metadata: null,
      });

      const result = await service.issueCertificate({
        userId: 'u1',
        templateId: 't1',
        title: 'DSA Completion',
      });

      expect(result.certificateNumber).toMatch(/^CERT-2026-/);
      expect(result.title).toBe('DSA Completion');
      expect(result.templateName).toBe('Course Completion');
    });

    it('throws NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.certificateTemplate.findUnique.mockResolvedValue({ id: 't1', name: 'Course' });

      await expect(
        service.issueCertificate({ userId: 'bad', templateId: 't1', title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for non-existent template', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', fullName: 'Alice' });
      prisma.certificateTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.issueCertificate({ userId: 'u1', templateId: 'bad', title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyCertificate', () => {
    it('returns valid for active certificate', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA',
        issuedAt: new Date(),
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        user: { fullName: 'Alice' },
      });

      const result = await service.verifyCertificate('valid_code');
      expect(result.valid).toBe(true);
      expect(result.recipientName).toBe('Alice');
    });

    it('returns invalid for revoked certificate', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA',
        issuedAt: new Date(),
        expiresAt: null,
        isRevoked: true,
        revokedAt: new Date(),
        user: { fullName: 'Alice' },
      });

      const result = await service.verifyCertificate('revoked_code');
      expect(result.valid).toBe(false);
      expect(result.isRevoked).toBe(true);
    });

    it('returns invalid for expired certificate', async () => {
      const pastDate = new Date('2020-01-01');
      prisma.certificate.findUnique.mockResolvedValue({
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA',
        issuedAt: new Date('2019-01-01'),
        expiresAt: pastDate,
        isRevoked: false,
        revokedAt: null,
        user: { fullName: 'Alice' },
      });

      const result = await service.verifyCertificate('expired_code');
      expect(result.valid).toBe(false);
    });

    it('throws NotFoundException for unknown code', async () => {
      prisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.verifyCertificate('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('renewCertificate', () => {
    it('extends expiry by 1 year', async () => {
      const futureDate = new Date('2027-06-01');
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA',
        expiresAt: futureDate,
        isRevoked: false,
        template: { name: 'Course' },
      });
      prisma.certificate.update.mockResolvedValue({
        id: 'cert1',
        certificateNumber: 'CERT-2026-00001',
        title: 'DSA',
        issuedAt: new Date(),
        expiresAt: new Date('2028-06-01'),
        verificationCode: 'abc',
        metadata: null,
        template: { name: 'Course' },
      });

      const result = await service.renewCertificate('cert1', 'u1');
      expect(result.expiresAt).toBeDefined();
    });

    it('throws when not owner', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        isRevoked: false,
      });

      await expect(service.renewCertificate('cert1', 'other_user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when certificate is revoked', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        isRevoked: true,
      });

      await expect(service.renewCertificate('cert1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLinkedInShareUrl', () => {
    it('returns cached URL if already generated', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        linkedinShareUrl: 'https://linkedin.com/share/test',
        verificationCode: 'abc',
      });

      const result = await service.getLinkedInShareUrl('cert1', 'u1');
      expect(result.shareUrl).toBe('https://linkedin.com/share/test');
    });

    it('generates and caches new URL', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        linkedinShareUrl: null,
        verificationCode: 'abc123',
      });
      prisma.certificate.update.mockResolvedValue({});

      const result = await service.getLinkedInShareUrl('cert1', 'u1');
      expect(result.shareUrl).toContain('linkedin.com');
      expect(prisma.certificate.update).toHaveBeenCalled();
    });

    it('throws when not owner', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert1',
        userId: 'u1',
        linkedinShareUrl: null,
        verificationCode: 'abc',
      });

      await expect(service.getLinkedInShareUrl('cert1', 'other')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listMyCertificates', () => {
    it('returns certificates sorted by issuedAt desc', async () => {
      prisma.certificate.findMany.mockResolvedValue([
        {
          id: 'c1',
          certificateNumber: 'CERT-2026-00002',
          title: 'Advanced',
          issuedAt: new Date('2026-06-01'),
          expiresAt: null,
          verificationCode: 'v2',
          metadata: null,
          template: { name: 'Course' },
        },
        {
          id: 'c2',
          certificateNumber: 'CERT-2026-00001',
          title: 'Basic',
          issuedAt: new Date('2026-01-01'),
          expiresAt: null,
          verificationCode: 'v1',
          metadata: { hours: 40 },
          template: { name: 'Completion' },
        },
      ]);

      const result = await service.listMyCertificates('u1');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Advanced');
      expect(result[1].title).toBe('Basic');
    });
  });
});
