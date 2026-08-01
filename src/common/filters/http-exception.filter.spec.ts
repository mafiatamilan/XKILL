import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

function mockHost(): ArgumentsHost {
  const json = jest.fn();
  const response = { status: jest.fn().mockReturnValue({ json }) };
  const request = { method: 'POST', originalUrl: '/api/v1/thing' };
  return {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost & { response: typeof response };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('formats HttpExceptions with their code/message', () => {
    const host = mockHost();
    filter.catch(new ForbiddenException({ code: 'USER_SUSPENDED', message: 'Suspended' }), host);
    expect(host.switchToHttp().getResponse().status).toHaveBeenCalledWith(403);
  });

  it('handles string-bodied HttpExceptions', () => {
    const host = mockHost();
    filter.catch(new BadRequestException('bad input'), host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('falls back to the exception name for sparse bodies', () => {
    const host = mockHost();
    filter.catch(new BadRequestException({ code: 'SPARSE' }), host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('maps unknown Prisma error codes to 400 Database Error', () => {
    const host = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Something broke', {
      code: 'P9000',
      clientVersion: '6',
    });
    filter.catch(error, host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('maps Prisma foreign key violations to 400', () => {
    const host = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError('FK failed', {
      code: 'P2003',
      clientVersion: '6',
    });
    filter.catch(error, host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('maps Prisma P2002 to 409 Conflict', () => {
    const host = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6',
      meta: { target: ['email'] },
    });
    filter.catch(error, host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(409);
  });

  it('maps Prisma P2025 to 404', () => {
    const host = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6',
    });
    filter.catch(error, host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(404);
  });

  it('falls back to 500 for unknown errors', () => {
    const host = mockHost();
    filter.catch(new Error('boom'), host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(500);
  });

  it('maps Prisma validation errors to 400', () => {
    const host = mockHost();
    const error = new Prisma.PrismaClientValidationError('Invalid field', { clientVersion: '6' });
    filter.catch(error, host);
    const resp = host.switchToHttp().getResponse();
    expect(resp.status).toHaveBeenCalledWith(400);
  });
});
