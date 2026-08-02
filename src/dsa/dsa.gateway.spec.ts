import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { AppConfigService } from '../config/app-config.service';
import { DsaGateway, SubmissionVerdictEvent } from './dsa.gateway';

describe('DsaGateway', () => {
  let gateway: DsaGateway;

  const accessSecret = 'access-secret';
  const issuer = 'xkill';
  const audience = 'xkill-app';

  const mockSocket = (handshake: Partial<Socket['handshake']>) => {
    const socket = {
      handshake: { auth: {}, headers: {}, ...handshake },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
    } as unknown as Socket;
    return socket;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DsaGateway,
        {
          provide: AppConfigService,
          useValue: {
            get: () => ({ jwt: { accessSecret, issuer, audience } }),
          },
        },
      ],
    }).compile();

    gateway = module.get(DsaGateway);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as unknown as Server;
  });

  const validToken = (sub = 'user-1') =>
    sign({ sub }, accessSecret, { issuer, audience, expiresIn: '1h' });

  describe('handleConnection', () => {
    it('authenticates via handshake auth token and joins the user room', async () => {
      const socket = mockSocket({ auth: { token: validToken() } });
      await gateway.handleConnection(socket);
      expect(socket.data.userId).toBe('user-1');
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('authenticates via the Authorization Bearer header', async () => {
      const socket = mockSocket({
        headers: { authorization: `Bearer ${validToken('user-2')}` },
      });
      await gateway.handleConnection(socket);
      expect(socket.data.userId).toBe('user-2');
      expect(socket.join).toHaveBeenCalledWith('user:user-2');
    });

    it('rejects a missing token', async () => {
      const socket = mockSocket({ auth: {} });
      await gateway.handleConnection(socket);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'UNAUTHORIZED',
        message: 'Missing access token',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('rejects an invalid token', async () => {
      const socket = mockSocket({ auth: { token: 'not-a-token' } });
      await gateway.handleConnection(socket);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects a token without a subject', async () => {
      const noSub = sign({}, accessSecret, { issuer, audience });
      const socket = mockSocket({ auth: { token: noSub } });
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('leaves the user room when authenticated', () => {
      const socket = mockSocket({ auth: {} });
      socket.data.userId = 'user-1';
      gateway.handleDisconnect(socket);
      expect(socket.leave).toHaveBeenCalledWith('user:user-1');
    });

    it('does nothing for unauthenticated sockets', () => {
      const socket = mockSocket({ auth: {} });
      gateway.handleDisconnect(socket);
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });

  describe('emitVerdict', () => {
    it('emits submission.verdict into the user room', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as unknown as Server;

      const event: SubmissionVerdictEvent = {
        submissionId: 's1',
        problemId: 'p1',
        status: 'completed',
        verdict: 'accepted',
        passedTestCases: 5,
        totalTestCases: 5,
      };
      gateway.emitVerdict('user-1', event);

      expect(to).toHaveBeenCalledWith('user:user-1');
      expect(emit).toHaveBeenCalledWith('submission.verdict', event);
    });
  });
});
