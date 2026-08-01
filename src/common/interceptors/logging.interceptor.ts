import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import { JsonLoggerService } from '../logger/json-logger.service';
import { requestContext } from '../logger/request-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();
    const method = request.method;
    const url = request.originalUrl ?? request.url;
    const start = Date.now();

    request.requestId = requestId;
    const store = { requestId, userId: request.user?.id as string | undefined };

    return requestContext.run(store, () =>
      next.handle().pipe(
        tap({
          next: () => {
            const response = context.switchToHttp().getResponse();
            response.setHeader('x-request-id', requestId);
            this.logger.log(`${method} ${url}`, 'HTTP', {
              statusCode: response.statusCode,
              durationMs: Date.now() - start,
            });
          },
          error: (err: Error) => {
            const status = (err as unknown as { status?: number }).status ?? 500;
            this.logger.error(`${method} ${url} failed`, err.stack, 'HTTP', {
              statusCode: status,
              durationMs: Date.now() - start,
            });
          },
        }),
      ),
    );
  }
}
