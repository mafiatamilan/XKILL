import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;
  let parentSpy: jest.SpyInstance;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    const grandParent = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate?: (...args: unknown[]) => unknown;
    };
    parentSpy = jest
      .spyOn(grandParent as { canActivate: (...args: unknown[]) => unknown }, 'canActivate')
      .mockReturnValue(true as never);
  });

  afterEach(() => {
    parentSpy.mockRestore();
  });

  function context(handler: () => void, cls: () => void): ExecutionContext {
    return { getHandler: () => handler, getClass: () => cls } as unknown as ExecutionContext;
  }

  it('lets public routes through without a token', () => {
    const handler = () => undefined;
    const cls = () => undefined;
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    const result = guard.canActivate(context(handler, cls));
    expect(result).toBe(true);
    expect(parentSpy).not.toHaveBeenCalled();
  });

  it('delegates to passport for non-public routes', () => {
    const result = guard.canActivate(
      context(
        () => undefined,
        () => undefined,
      ),
    );
    expect(parentSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('throws when no user was attached', () => {
    expect(() => guard.handleRequest(undefined, null)).toThrow(UnauthorizedException);
  });

  it('throws when passport reported an error', () => {
    expect(() => guard.handleRequest(new Error('bad'), undefined)).toThrow(UnauthorizedException);
  });

  it('returns the user on success', () => {
    expect(guard.handleRequest(undefined, { id: 'u1' })).toEqual({ id: 'u1' });
  });
});
