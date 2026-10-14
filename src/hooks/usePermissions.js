import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';

/**
 * Hook to check permissions on the client side for UI gating.
 * 
 * @param {Object} resource - The project or organization object (must have members array populated with user IDs)
 * @param {string} scope - 'org' | 'project'
 */
export function usePermissions(resource, scope = 'project') {
  const { user } = useAuth();

  const can = (permission) => {
    if (!user || !resource) return false;

    let member;
    if (scope === 'project') {
      // First check project level
      member = resource.members?.find(m => {
        // Handle both populated user object and raw object ID
        const memberUserId = m.user?._id || m.user;
        return memberUserId === user.id;
      });

      if (member) {
        return hasPermission(member.role, permission, false);
      }

      // If no project role, we usually rely on backend to pass org role, 
      // but on frontend we might assume 'false' unless we have full org context.
      // For a robust system, the API should return a computed `permissions` array for the current user.
    } else if (scope === 'org') {
      member = resource.members?.find(m => {
        const memberUserId = m.user?._id || m.user;
        return memberUserId === user.id;
      });

      if (member) {
        return hasPermission(member.role, permission, true);
      }
    }

    return false;
  };

  return { can };
}
