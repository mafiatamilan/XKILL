import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

export interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.message;
      } else if (typeof body === 'object' && body !== null) {
        const res = body as { message?: string | string[]; error?: string; code?: string };
        message = res.message ?? exception.message;
        error = res.error ?? exception.name;
        code = res.code;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      message = mapped.message;
      error = mapped.error;
      code = mapped.code;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data sent to the database';
      error = 'Prisma Validation Error';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} → ${status}: ${JSON.stringify(exception, Object.getOwnPropertyNames(exception))}`,
      );
    }

    const envelope: ErrorEnvelope = {
      statusCode: status,
      message,
      error,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(status).json(envelope);
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
    error: string;
    code: string;
  } {
    const target = (error.meta?.target as string[] | string) ?? '';
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with the same value already exists (${target}).`,
          error: 'Conflict',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested resource was not found.',
          error: 'Not Found',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The operation violates a foreign key constraint.',
          error: 'Bad Request',
          code: 'FOREIGN_KEY_VIOLATION',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The change would violate a required relation.',
          error: 'Bad Request',
          code: 'RELATION_VIOLATION',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'A database constraint was violated.',
          error: 'Database Error',
          code: `DB_${error.code}`,
        };
    }
  }
}
