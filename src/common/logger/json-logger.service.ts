import { Injectable, LoggerService } from '@nestjs/common';
import { getRequestId } from './request-context';

type Meta = Record<string, unknown>;

@Injectable()
export class JsonLoggerService implements LoggerService {
  private write(level: string, message: unknown, context: string, meta?: Meta): void {
    const record = {
      level,
      message,
      context,
      requestId: getRequestId() ?? null,
      timestamp: new Date().toISOString(),
      ...(meta ?? {}),
    };
    const line = JSON.stringify(record);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  log(message: unknown, context?: string, meta?: Meta): void {
    this.write('info', message, context ?? '', meta);
  }

  error(message: unknown, stack?: string | Meta, context?: string, meta?: Meta): void {
    const ctx = typeof stack === 'string' ? (context ?? '') : (context ?? '');
    const extra: Meta | undefined = typeof stack === 'string' ? meta : ((stack as Meta) ?? meta);
    this.write('error', message, ctx, {
      ...(extra ?? {}),
      ...(stack !== undefined ? { stack } : {}),
    });
  }

  warn(message: unknown, context?: string, meta?: Meta): void {
    this.write('warn', message, context ?? '', meta);
  }

  debug(message: unknown, context?: string, meta?: Meta): void {
    this.write('debug', message, context ?? '', meta);
  }

  verbose(message: unknown, context?: string, meta?: Meta): void {
    this.write('verbose', message, context ?? '', meta);
  }
}
