import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';

export const ROLE_NAMES = [
  'admin',
  'student',
  'faculty',
  'college_admin',
  'recruiter',
  'tpo',
  'parent',
  'mentor',
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const ACTIONS = ['manage', 'read', 'create', 'update', 'delete'] as const;
export type AppAction = (typeof ACTIONS)[number];

export type AppSubject = string;
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/**
 * Permission strings are stored as `${action}:${subject}`, e.g. `manage:all`,
 * `read:users`, `update:roles`. `manage:all` is the super-user wildcard.
 */
export function permissionName(action: AppAction, subject: AppSubject): string {
  return `${action}:${subject}`;
}

export function buildAbility(permissions: Array<{ name: string }>): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const permission of permissions) {
    const [action, subject] = permission.name.split(':');
    if (!action || !subject) {
      continue;
    }
    if (subject === 'all' && action === 'manage') {
      can('manage', 'all');
    } else {
      can(action as AppAction, subject);
    }
  }
  return build();
}

export function canRole(
  permissions: Array<{ name: string }>,
  action: AppAction,
  subject: AppSubject,
): boolean {
  return buildAbility(permissions).can(action, subject);
}
