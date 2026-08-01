import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../config/app-config.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuthRepository } from './auth.repository';
import { AccessTokenPayload } from './token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly repository: AuthRepository,
  ) {
    const { jwt } = config.get();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.accessSecret,
      issuer: jwt.issuer,
      audience: jwt.audience,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.repository.findByIdActive(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'The user no longer exists or is suspended',
      });
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      sessionId: payload.sid,
      permissions: user.role.permissions,
    };
  }
}
