import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IssueCertificateDto,
  CertificateResponseDto,
  VerifyCertificateResponseDto,
} from './dto/certificate.dto';
import { randomBytes } from 'crypto';

const CERT_PREFIX = 'CERT';
const YEAR = new Date().getFullYear();

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async issueCertificate(dto: IssueCertificateDto): Promise<CertificateResponseDto> {
    const [user, template] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, fullName: true },
      }),
      this.prisma.certificateTemplate.findUnique({ where: { id: dto.templateId } }),
    ]);

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Certificate template not found',
      });
    }

    const certificateNumber = await this.generateCertificateNumber();
    const verificationCode = randomBytes(32).toString('hex');

    const certificate = await this.prisma.certificate.create({
      data: {
        userId: dto.userId,
        templateId: dto.templateId,
        certificateNumber,
        verificationCode,
        title: dto.title,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    this.logger.log(`Certificate issued: ${certificateNumber} to user ${dto.userId}`);

    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      title: certificate.title,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt ?? undefined,
      templateName: template.name,
      verificationCode: certificate.verificationCode,
      metadata: (certificate.metadata as Record<string, unknown>) ?? undefined,
    };
  }

  async verifyCertificate(verificationCode: string): Promise<VerifyCertificateResponseDto> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: { user: { select: { fullName: true } } },
    });

    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      });
    }

    const now = new Date();
    const isExpired = certificate.expiresAt ? certificate.expiresAt < now : false;

    return {
      valid: !certificate.isRevoked && !isExpired,
      certificateNumber: certificate.certificateNumber,
      title: certificate.title,
      recipientName: certificate.user.fullName,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt ?? undefined,
      isRevoked: certificate.isRevoked,
      revokedAt: certificate.revokedAt ?? undefined,
    };
  }

  async getCertificateQr(
    certificateId: string,
  ): Promise<{ qrDataUrl: string; verificationUrl: string }> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      select: { id: true, verificationCode: true },
    });

    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      });
    }

    const verificationUrl = `${process.env.API_BASE_URL ?? 'http://localhost:3000'}/api/v1/certificates/verify/${certificate.verificationCode}`;

    // QR code as data URL (simple base64-encoded SVG for now)
    const qrDataUrl = this.generateQrDataUrl(verificationUrl);

    return { qrDataUrl, verificationUrl };
  }

  async getCertificatePdf(
    verificationCode: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        user: { select: { fullName: true } },
        template: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      });
    }

    if (certificate.isRevoked) {
      throw new BadRequestException({
        code: 'CERTIFICATE_REVOKED',
        message: 'Certificate has been revoked',
      });
    }

    const pdfBuffer = this.generatePdfBuffer(certificate);
    const filename = `certificate-${certificate.certificateNumber}.pdf`;

    return { buffer: pdfBuffer, filename, contentType: 'application/pdf' };
  }

  async renewCertificate(certificateId: string, userId: string): Promise<CertificateResponseDto> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { template: { select: { name: true } } },
    });

    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      });
    }

    if (certificate.userId !== userId) {
      throw new BadRequestException({
        code: 'NOT_OWNER',
        message: 'You can only renew your own certificates',
      });
    }

    if (certificate.isRevoked) {
      throw new BadRequestException({
        code: 'CERTIFICATE_REVOKED',
        message: 'Cannot renew a revoked certificate',
      });
    }

    // Extend expiry by 1 year from current expiry (or from now if no expiry)
    const baseDate = certificate.expiresAt ?? new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const updated = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { expiresAt: newExpiry },
      include: { template: { select: { name: true } } },
    });

    this.logger.log(
      `Certificate renewed: ${updated.certificateNumber}, new expiry: ${newExpiry.toISOString()}`,
    );

    return {
      id: updated.id,
      certificateNumber: updated.certificateNumber,
      title: updated.title,
      issuedAt: updated.issuedAt,
      expiresAt: updated.expiresAt ?? undefined,
      templateName: updated.template.name,
      verificationCode: updated.verificationCode,
      metadata: (updated.metadata as Record<string, unknown>) ?? undefined,
    };
  }

  async getLinkedInShareUrl(certificateId: string, userId: string): Promise<{ shareUrl: string }> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      });
    }

    if (certificate.userId !== userId) {
      throw new BadRequestException({
        code: 'NOT_OWNER',
        message: 'You can only share your own certificates',
      });
    }

    if (certificate.linkedinShareUrl) {
      return { shareUrl: certificate.linkedinShareUrl };
    }

    // Generate LinkedIn share URL
    const verificationUrl = `${process.env.API_BASE_URL ?? 'http://localhost:3000'}/api/v1/certificates/verify/${certificate.verificationCode}`;
    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`;

    await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { linkedinShareUrl },
    });

    return { shareUrl: linkedinShareUrl };
  }

  async listMyCertificates(userId: string): Promise<CertificateResponseDto[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: { template: { select: { name: true } } },
      orderBy: { issuedAt: 'desc' },
    });

    return certificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      title: cert.title,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt ?? undefined,
      templateName: cert.template.name,
      verificationCode: cert.verificationCode,
      metadata: (cert.metadata as Record<string, unknown>) ?? undefined,
    }));
  }

  private async generateCertificateNumber(): Promise<string> {
    // Get count of certificates this year to generate sequential number
    const count = await this.prisma.certificate.count({
      where: {
        issuedAt: {
          gte: new Date(`${YEAR}-01-01`),
          lt: new Date(`${YEAR + 1}-01-01`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(5, '0');
    return `${CERT_PREFIX}-${YEAR}-${seq}`;
  }

  private generateQrDataUrl(url: string): string {
    // Simple QR-like representation using SVG
    // In production, use a proper QR library like `qrcode`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <text x="10" y="100" font-size="8" fill="black">Verify: ${url.slice(0, 30)}...</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  private generatePdfBuffer(_certificate: {
    certificateNumber: string;
    title: string;
    issuedAt: Date;
    expiresAt: Date | null;
    user: { fullName: string };
    template: { content: unknown; name: string };
  }): Buffer {
    // Minimal PDF buffer for now — in production use @react-pdf/renderer or pdfkit
    const pdfContent = `
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
340
%%EOF`;
    return Buffer.from(pdfContent);
  }
}
