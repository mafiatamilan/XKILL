import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verify } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { AppConfigService } from '../config/app-config.service';

export interface SubmissionVerdictEvent {
  submissionId: string;
  problemId: string;
  status: string;
  verdict?: string | null;
  passedTestCases?: number;
  totalTestCases?: number;
}

export const USER_ROOM_PREFIX = 'user';

/**
 * Real-time verdict delivery for the DSA platform. A client authenticates by
 * sending `Authorization: Bearer <accessToken>` in the handshake; on success it
 * joins `user:{id}` and receives `submission.verdict` events. The same gateway
 * pattern (rooms keyed by user id) is reused by Coding Battles and Leaderboards.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class DsaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DsaGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly config: AppConfigService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { code: 'UNAUTHORIZED', message: 'Missing access token' });
        client.disconnect(true);
        return;
      }
      const { jwt } = this.config.get();
      const payload = verify(token, jwt.accessSecret, {
        issuer: jwt.issuer,
        audience: jwt.audience,
      }) as { sub: string };
      if (!payload?.sub) {
        throw new Error('Token payload missing sub');
      }
      client.data.userId = payload.sub;
      await client.join(this.room(payload.sub));
    } catch (err) {
      this.logger.debug(`WebSocket connection rejected: ${(err as Error).message}`);
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    if (client.data.userId) {
      void client.leave(this.room(client.data.userId as string));
    }
  }

  /** Emit a verdict-ready event to every socket owned by the user. */
  emitVerdict(userId: string, event: SubmissionVerdictEvent): void {
    this.server.to(this.room(userId)).emit('submission.verdict', event);
  }

  /** Emit an arbitrary event to every socket owned by the user (reused by battles). */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(this.room(userId)).emit(event, payload);
  }

  private room(userId: string): string {
    return `${USER_ROOM_PREFIX}:${userId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }
}
