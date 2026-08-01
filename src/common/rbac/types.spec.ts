import { buildAbility, canRole, permissionName, ROLE_NAMES } from './types';

describe('RBAC helpers', () => {
  it('exposes the canonical role names', () => {
    expect(ROLE_NAMES).toEqual(
      expect.arrayContaining([
        'admin',
        'student',
        'faculty',
        'college_admin',
        'recruiter',
        'tpo',
        'parent',
        'mentor',
      ]),
    );
  });

  it('formats permission names as action:subject', () => {
    expect(permissionName('read', 'users')).toBe('read:users');
    expect(permissionName('manage', 'all')).toBe('manage:all');
  });

  it('grants a permission from the stored list', () => {
    expect(canRole([{ name: 'read:users' }], 'read', 'users')).toBe(true);
    expect(canRole([{ name: 'read:users' }], 'update', 'users')).toBe(false);
  });

  it('treats manage:all as a super-user wildcard', () => {
    const ability = buildAbility([{ name: 'manage:all' }]);
    expect(ability.can('delete', 'anything')).toBe(true);
  });

  it('ignores malformed permission names', () => {
    expect(canRole([{ name: 'not-a-valid-permission' }], 'read', 'x')).toBe(false);
  });
});
