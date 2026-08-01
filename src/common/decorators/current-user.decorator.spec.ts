import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

function applyDecorator(decorator: unknown, data: unknown) {
  const applied = decorator as (data: unknown) => ParameterDecorator;
  class Target {
    handler(@applied(data) _param: unknown): void {}
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Target, 'handler');
  const entry = Object.values(metadata)[0] as {
    factory: (data: unknown, ctx: ExecutionContext) => unknown;
  };
  return entry.factory;
}

describe('CurrentUser decorator', () => {
  function makeCtx(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('returns the full user when no key is requested', () => {
    const factory = applyDecorator(CurrentUser, undefined);
    const user = { id: 'u1', email: 'a@b.com' };
    expect(factory(undefined, makeCtx(user))).toEqual(user);
  });

  it('returns a single field when a key is requested', () => {
    const factory = applyDecorator(CurrentUser, 'id');
    const user = { id: 'u1', email: 'a@b.com' };
    expect(factory('id', makeCtx(user))).toBe('u1');
  });

  it('is safe when no user is attached', () => {
    const factory = applyDecorator(CurrentUser, undefined);
    expect(factory(undefined, makeCtx(undefined))).toBeUndefined();
    expect(factory('id', makeCtx(undefined))).toBeUndefined();
  });
});
