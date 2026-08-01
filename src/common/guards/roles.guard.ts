import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAction, AppSubject, canRole } from '../rbac/types';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

function methodToAction(method: string): AppAction {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PATCH':
    case 'PUT':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * Role-based access guard built on top of casl abilities. A handler is authorized
 * when BOTH hold:
 *  1. the authenticated user's role is listed in `@Roles(...)`, and
 *  2. the role's permission set (data-driven, stored in the DB) grants the
 *     required action on the resource subject (from `@Resource(...)`, default `all`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const resource = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const subject: AppSubject = resource ?? 'all';
    const action = methodToAction(context.switchToHttp().getRequest().method);

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('No authenticated user attached to the request');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not allowed to access this resource (required: ${roles.join(
          ', ',
        )})`,
      );
    }

    if (!canRole(user.permissions, action, subject)) {
      throw new ForbiddenException(
        `Role '${user.role}' is missing permission '${action}:${subject}'`,
      );
    }

    return true;
  }
}
