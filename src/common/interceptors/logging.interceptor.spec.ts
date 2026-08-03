import { ExecutionContext } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { JsonLoggerService } from '../logger/json-logger.service';

describe('LoggingInterceptor', () => {
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    verbose: jest.Mock;
  };
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
    interceptor = new LoggingInterceptor(logger as unknown as JsonLoggerService);
  });

  function makeContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/health',
          originalUrl: '/api/v1/health',
          headers,
        }),
        getResponse: () => ({ statusCode: 200, setHeader: jest.fn(), headersSent: false }),
      }),
    } as unknown as ExecutionContext;
  }

  it('uses a provided x-request-id and logs success', async () => {
    const next = { handle: () => of('result') };
    const ctx = makeContext({ 'x-request-id': 'req-123' });
    await firstValueFrom(interceptor.intercept(ctx, next as any));
    expect(logger.log).toHaveBeenCalledWith('GET /api/v1/health', 'HTTP', expect.any(Object));
  });

  it('does not set x-request-id after the response has already been sent', async () => {
    const setHeader = jest.fn();
    const response = { statusCode: 200, setHeader, headersSent: true };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/health',
          originalUrl: '/api/v1/health',
          headers: {},
        }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of('result') };
    await firstValueFrom(interceptor.intercept(ctx, next as any));
    expect(setHeader).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalled();
  });

  it('logs errors with their status', async () => {
    const err = new Error('boom') as Error & { status?: number };
    err.status = 500;
    const next = { handle: () => throwError(() => err) };
    await expect(firstValueFrom(interceptor.intercept(makeContext(), next as any))).rejects.toThrow(
      'boom',
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
