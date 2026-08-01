import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '../../audit/audit.service';

describe('AuditInterceptor', () => {
  let audit: { record: jest.Mock };
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(audit as unknown as AuditService);
  });

  function makeContext(method: string, overrides: Record<string, unknown> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          originalUrl: '/api/v1/admin/users/u1/suspend',
          url: '/api/v1/admin/users/u1/suspend',
          body: { reason: 'spam', password: 'secret' },
          ip: '1.2.3.4',
          user: { id: 'admin-1' },
          ...overrides,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('records an audit entry for mutating requests', (done) => {
    const next = { handle: () => of('result') };
    const result = interceptor.intercept(makeContext('PATCH'), next as any);
    result.subscribe({
      complete: () => {
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'admin-1',
            action: 'PATCH admin/users/u1/suspend',
            entityType: 'admin',
            entityId: 'suspend',
          }),
        );
        done();
      },
    });
  });

  it('redacts sensitive fields from the audited body', (done) => {
    const next = { handle: () => of('result') };
    const result = interceptor.intercept(makeContext('POST'), next as any);
    result.subscribe({
      complete: () => {
        const call = audit.record.mock.calls[0][0] as {
          metadata: { body: Record<string, unknown> };
        };
        expect(call.metadata.body.password).toBe('[REDACTED]');
        expect(call.metadata.body.reason).toBe('spam');
        done();
      },
    });
  });

  it('passes GET requests through without auditing', (done) => {
    const next = { handle: () => of('result') };
    const result = interceptor.intercept(makeContext('GET'), next as any);
    result.subscribe({
      complete: () => {
        expect(audit.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('handles routes without the api/v1 prefix and nested arrays', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'PATCH',
          originalUrl: '/users/u1',
          body: { tags: ['a', 'b'], nested: { token: 'secret' }, password: 'x' },
          ip: '1.1.1.1',
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of('result') };
    const result = interceptor.intercept(context, next as any);
    result.subscribe({
      complete: () => {
        const call = audit.record.mock.calls[0][0] as { metadata: { body: Record<string, any> } };
        expect(call.metadata.body.tags).toEqual(['a', 'b']);
        expect(call.metadata.body.nested.token).toBe('[REDACTED]');
        expect(call.metadata.body.password).toBe('[REDACTED]');
        done();
      },
    });
  });

  it('does not record when the request errors', (done) => {
    const next = { handle: () => throwError(() => new Error('boom')) };
    const result = interceptor.intercept(makeContext('DELETE'), next as any);
    result.subscribe({
      error: () => {
        expect(audit.record).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
