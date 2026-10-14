// Permission Constants
export const PERMISSIONS = {
  // Organization Level
  ORG_MANAGE_SETTINGS: 'org:manage:settings',
  ORG_MANAGE_BILLING: 'org:manage:billing',
  ORG_INVITE_MEMBERS: 'org:invite:members',
  ORG_REMOVE_MEMBERS: 'org:remove:members',
  ORG_CREATE_PROJECT: 'org:create:project',
  ORG_DELETE_PROJECT: 'org:delete:project',
  
  // Project Level
  PROJECT_MANAGE_SETTINGS: 'project:manage:settings',
  PROJECT_MANAGE_MEMBERS: 'project:manage:members',
  PROJECT_DELETE: 'project:delete',
  
  // Task Level
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_DELETE: 'task:delete',
  TASK_ASSIGN: 'task:assign',
  
  // Comment/Activity Level
  COMMENT_CREATE: 'comment:create',
  COMMENT_DELETE: 'comment:delete',
};

// Role -> Permission Mapping
export const ROLE_PERMISSIONS = {
  // Organization Roles
  // owner = workspace creator (gets ALL permissions)
  ORG_OWNER: Object.values(PERMISSIONS),
  ORG_ADMIN: [
    PERMISSIONS.ORG_MANAGE_SETTINGS,
    PERMISSIONS.ORG_INVITE_MEMBERS,
    PERMISSIONS.ORG_REMOVE_MEMBERS,
    PERMISSIONS.ORG_CREATE_PROJECT,
    PERMISSIONS.ORG_DELETE_PROJECT,
  ],
  ORG_MANAGER: [
    PERMISSIONS.ORG_INVITE_MEMBERS,
    PERMISSIONS.ORG_CREATE_PROJECT,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_DELETE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.COMMENT_CREATE,
  ],
  ORG_MEMBER: [
    PERMISSIONS.ORG_CREATE_PROJECT,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.COMMENT_CREATE,
  ],
  ORG_GUEST: [
    PERMISSIONS.COMMENT_CREATE,
  ],

  // Project Roles
  PROJECT_OWNER: [
    PERMISSIONS.PROJECT_MANAGE_SETTINGS,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_DELETE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
  ],
  PROJECT_ADMIN: [
    PERMISSIONS.PROJECT_MANAGE_SETTINGS,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_DELETE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
  ],
  PROJECT_MEMBER: [
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.COMMENT_CREATE,
  ],
  PROJECT_VIEWER: [
    // Read-only access
  ],
};

// Friendly display names for roles
export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  guest: 'Guest',
  viewer: 'Viewer',
};

// Role badge color classes for UI
export const ROLE_COLORS = {
  owner: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  admin: 'border-brand-500/30 text-brand-600 bg-brand-500/10',
  manager: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  member: 'border-surface-700 text-surface-300 bg-surface-800/50',
  guest: 'border-surface-700 text-surface-500 bg-surface-800/30',
  viewer: 'border-surface-700 text-surface-500 bg-surface-800/30',
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission, isOrgRole = false) {
  const roleKey = isOrgRole ? `ORG_${role.toUpperCase()}` : `PROJECT_${role.toUpperCase()}`;
  const permissions = ROLE_PERMISSIONS[roleKey];
  if (!permissions) return false;
  return permissions.includes(permission);
}
