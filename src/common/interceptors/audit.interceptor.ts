import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'refreshToken',
  'totpCode',
  'secret',
  'token',
  'accessToken',
  'clientSecret',
]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitize(val);
    }
    return result;
  }
  return value;
}

/**
 * Writes a best-effort audit entry for every mutating request (POST/PATCH/PUT/DELETE)
 * that completes successfully. Domain services additionally write structured
 * before/after diffs for sensitive operations (admin actions, role changes, ...).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const route = (request.originalUrl ?? request.url).replace(/^\/api\/v1\//, '').split('?')[0];
    const segments = route.split('/').filter(Boolean);
    const entityType = segments[0] ?? 'unknown';
    const entityId = segments.length > 1 ? segments[segments.length - 1] : undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.record({
            userId: request.user?.id,
            action: `${method} ${route}`,
            entityType,
            entityId,
            metadata: { body: sanitize(request.body) },
            ip: request.ip,
          });
        },
        error: () => {
          /* errors are logged by the exception filter; nothing to record here */
        },
      }),
    );
  }
}
