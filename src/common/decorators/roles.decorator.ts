import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * Marks a handler as requiring the user's role to be one of `roles`. The actual
 * authorization is evaluated against the casl ability derived from the role's
 * permission set in `RolesGuard`.
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
