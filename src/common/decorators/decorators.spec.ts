import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { Resource, RESOURCE_KEY } from './resource.decorator';
import { Roles, ROLES_KEY } from './roles.decorator';

describe('decorators', () => {
  it('Public marks handlers as public', () => {
    @Public()
    class C {
      m(): void {}
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, C)).toBe(true);
  });

  it('Resource declares the casl subject', () => {
    @Resource('users')
    class C {
      m(): void {}
    }
    expect(Reflect.getMetadata(RESOURCE_KEY, C)).toBe('users');
  });

  it('Roles declares allowed roles', () => {
    @Roles('admin', 'tpo')
    class C {
      m(): void {}
    }
    expect(Reflect.getMetadata(ROLES_KEY, C)).toEqual(['admin', 'tpo']);
  });
});
