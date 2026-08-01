import { JsonLoggerService } from './json-logger.service';

describe('JsonLoggerService', () => {
  let logger: JsonLoggerService;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger = new JsonLoggerService();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs structured info records', () => {
    logger.log('hello', 'AuthService', { userId: 'u1' });
    const record = JSON.parse(logSpy.mock.calls[0][0]);
    expect(record).toMatchObject({
      level: 'info',
      message: 'hello',
      context: 'AuthService',
      userId: 'u1',
    });
    expect(record.timestamp).toBeTruthy();
  });

  it('routes error records to console.error', () => {
    logger.error('boom', undefined, 'AuthService', { code: 'X' });
    const record = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(record.level).toBe('error');
    expect(record.code).toBe('X');
  });

  it('supports the stack-as-meta overload', () => {
    logger.error('boom', { userId: 'u1' }, 'AuthService');
    const record = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(record.userId).toBe('u1');
    expect(record.context).toBe('AuthService');
  });

  it('handles a string stack with a context and meta', () => {
    logger.error('boom', 'line:1\nline:2', 'AuthService', { code: 'X' });
    const record = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(record.level).toBe('error');
    expect(record.context).toBe('AuthService');
    expect(record.code).toBe('X');
    expect(record.stack).toBe('line:1\nline:2');
  });

  it('falls back to an empty context when omitted', () => {
    logger.error('boom');
    expect(JSON.parse(errorSpy.mock.calls[0][0]).context).toBe('');
    logger.warn('careful');
    expect(JSON.parse(warnSpy.mock.calls[0][0]).context).toBe('');
    logger.debug('trace');
    expect(JSON.parse(logSpy.mock.calls[0][0]).context).toBe('');
    logger.verbose('verb');
    expect(JSON.parse(logSpy.mock.calls[1][0]).context).toBe('');
  });

  it('routes warn and debug records to their targets', () => {
    logger.warn('careful', 'X');
    expect(JSON.parse(warnSpy.mock.calls[0][0]).level).toBe('warn');
    logger.debug('trace', 'X');
    expect(JSON.parse(logSpy.mock.calls[0][0]).level).toBe('debug');
  });
});
