import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OAuthService } from './oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { LinkedinStrategy } from './strategies/linkedin.strategy';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [PassportModule.register({ session: false }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    TokenService,
    TwoFactorService,
    JwtStrategy,
    OAuthService,
    GoogleStrategy,
    GithubStrategy,
    LinkedinStrategy,
  ],
  exports: [AuthService, AuthRepository, TokenService, TwoFactorService],
})
export class AuthModule {}
