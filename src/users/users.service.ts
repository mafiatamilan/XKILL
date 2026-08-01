import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { SessionResponseDto } from './dto/session-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly authRepository: AuthRepository) {}

  async listSessions(
    userId: string,
    currentSessionId: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ data: SessionResponseDto[]; meta: PaginationMeta }> {
    const [total, sessions] = await Promise.all([
      this.authRepository.countUserSessions(userId),
      this.authRepository.listUserSessions(userId, (page - 1) * limit, limit),
    ]);

    const data = sessions.map((session) => {
      const dto = new SessionResponseDto();
      dto.id = session.id;
      dto.device = {
        name: session.device?.name ?? undefined,
        platform: session.device?.platform ?? undefined,
        browser: session.device?.browser ?? undefined,
        os: session.device?.os ?? undefined,
      };
      dto.ip = session.ip ?? undefined;
      dto.userAgent = session.userAgent ?? undefined;
      dto.issuedAt = session.issuedAt.toISOString();
      dto.lastUsedAt = session.lastUsedAt.toISOString();
      dto.expiresAt = session.expiresAt.toISOString();
      dto.current = Boolean(currentSessionId && session.id === currentSessionId);
      return dto;
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.authRepository.revokeUserSession(sessionId, userId, new Date());
    if (!revoked) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found or already revoked',
      });
    }
  }
}
