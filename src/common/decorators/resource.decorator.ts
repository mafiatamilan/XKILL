import { SetMetadata } from '@nestjs/common';

export const RESOURCE_KEY = 'resource';

/**
 * Declares the casl subject a handler operates on. Combined with the HTTP method
 * (GET → `read`, POST → `create`, PATCH/PUT → `update`, DELETE → `delete`) the
 * `RolesGuard` resolves the required permission. Defaults to `all`.
 */
export const Resource = (subject: string): MethodDecorator & ClassDecorator =>
  SetMetadata(RESOURCE_KEY, subject);
