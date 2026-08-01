import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthService, OAuthProvider } from './oauth.service';
import { AppConfigService } from '../config/app-config.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailDto, ResetPasswordDto, TwoFactorCodeDto } from './dto/token.dto';

const AUTH_THROTTLE = {
  default: {
    limit: Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10),
    ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60000),
  },
};

const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'github', 'linkedin'];

@ApiTags('auth')
@Controller('auth')
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly oauth: OAuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new account (default role: student)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email + password (TOTP code required once 2FA is enabled)' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a session via its refresh token' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify an email address using the emailed token' })
  verifyEmail(@Param('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend the email verification link (idempotent)' })
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerificationEmail(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a password reset email (always returns 200)' })
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password with a reset token; revokes all sessions' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate a TOTP secret + QR code for the current user' })
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.setup(user.id, user.email);
  }

  @ApiBearerAuth()
  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a TOTP code and enable 2FA' })
  async verifyTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    await this.twoFactor.enable(user.id, dto.totpCode);
    return { enabled: true };
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable 2FA after verifying a TOTP code' })
  async disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    await this.twoFactor.disable(user.id, dto.totpCode);
    return { enabled: false };
  }

  @Public()
  @Get('oauth/:provider')
  @HttpCode(302)
  @ApiOperation({ summary: 'Redirect to the OAuth provider authorize URL' })
  oauthStart(
    @Param('provider', new ValidationPipe({ transform: true, whitelist: true })) provider: string,
  ) {
    const normalized = this.parseProvider(provider);
    return { url: this.oauth.generateAuthorizeUrl(normalized), statusCode: 302 };
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthRedirect(req, res);
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthRedirect(req, res);
  }

  @Public()
  @Get('oauth/linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  linkedinCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthRedirect(req, res);
  }

  private oauthRedirect(req: Request, res: Response): void {
    const tokens = req.user as { accessToken: string; refreshToken: string };
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    res.redirect(302, `${this.config.get().webAppUrl}/oauth/callback?${params.toString()}`);
  }

  private parseProvider(provider: string): OAuthProvider {
    if (!OAUTH_PROVIDERS.includes(provider as OAuthProvider)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_OAUTH_PROVIDER',
        message: `Supported providers: ${OAUTH_PROVIDERS.join(', ')}`,
      });
    }
    return provider as OAuthProvider;
  }
}
