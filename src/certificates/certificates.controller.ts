import { Controller, Get, Param, Post, Res, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './dto/certificate.dto';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('student', 'faculty', 'college_admin')
  @Resource('certificates')
  @ApiOperation({ summary: 'Issue a new certificate' })
  issueCertificate(@Body() dto: IssueCertificateDto) {
    return this.certificates.issueCertificate(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('certificates')
  @ApiOperation({ summary: 'List my certificates' })
  listMyCertificates(@CurrentUser() user: AuthenticatedUser) {
    return this.certificates.listMyCertificates(user.id);
  }

  @Get('verify/:code')
  @Public()
  @ApiOperation({ summary: 'Verify a certificate (public, no auth)' })
  verifyCertificate(@Param('code') code: string) {
    return this.certificates.verifyCertificate(code);
  }

  @Get(':id/qr')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('certificates')
  @ApiOperation({ summary: 'Get QR code for certificate verification' })
  getCertificateQr(@Param('id') id: string) {
    return this.certificates.getCertificateQr(id);
  }

  @Get(':id/pdf')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('certificates')
  @ApiOperation({ summary: 'Download certificate as PDF' })
  async getCertificatePdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename, contentType } = await this.certificates.getCertificatePdf(id);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post(':id/renew')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('certificates')
  @ApiOperation({ summary: 'Renew certificate (extend expiry by 1 year)' })
  renewCertificate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificates.renewCertificate(id, user.id);
  }

  @Post(':id/share/linkedin')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('certificates')
  @ApiOperation({ summary: 'Get LinkedIn share URL for certificate' })
  getLinkedInShareUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificates.getLinkedInShareUrl(id, user.id);
  }
}
