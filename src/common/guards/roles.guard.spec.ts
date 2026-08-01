import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOURCE_KEY } from '../decorators/resource.decorator';

function context(method: string, user: unknown): ExecutionContext {
  const handler = () => undefined;
  const cls = () => undefined;
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function setMeta(target: object, key: string, value: unknown) {
    Reflect.defineMetadata(key, value, target);
  }

  it('allows routes without role metadata', () => {
    expect(guard.canActivate(context('GET', undefined))).toBe(true);
  });

  it('throws when no user is attached to the request', () => {
    const ctx = context('GET', undefined);
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws when the user role is not allowed', () => {
    const ctx = context('GET', {
      role: 'student',
      permissions: [{ name: 'manage:all' }],
    });
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('maps the HTTP method to the casl action and checks permissions', () => {
    const user = { role: 'admin', permissions: [{ name: 'read:roles' }] };
    const ctx = context('GET', user);
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    setMeta(ctx.getHandler(), RESOURCE_KEY, 'roles');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when the permission is missing', () => {
    const user = { role: 'admin', permissions: [{ name: 'read:users' }] };
    const ctx = context('DELETE', user);
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    setMeta(ctx.getHandler(), RESOURCE_KEY, 'roles');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('defaults the subject to all when no resource is declared', () => {
    const user = { role: 'admin', permissions: [{ name: 'manage:all' }] };
    const ctx = context('GET', user);
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('maps unrecognized methods to the read action', () => {
    const user = { role: 'admin', permissions: [{ name: 'read:all' }] };
    const ctx = context('OPTIONS', user);
    setMeta(ctx.getHandler(), ROLES_KEY, ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
