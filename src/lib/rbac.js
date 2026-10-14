import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSession } from './auth';
import dbConnect from './db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import { hasPermission } from './permissions';

/**
 * True when the user is a member of the project: the same membership check the
 * project routes make (`Project.findOne({ _id, 'members.user': userId })`).
 * For routes whose body is not JSON (multipart uploads), where
 * requirePermission below cannot read the project id.
 */
export async function isProjectMember(projectId, userId) {
  if (!userId || typeof projectId !== 'string' || !mongoose.isObjectIdOrHexString(projectId)) {
    return false;
  }
  await dbConnect();
  return !!(await Project.exists({ _id: projectId, 'members.user': userId }));
}

/**
 * Middleware wrapper to enforce RBAC on API routes.
 * 
 * Usage:
 * export const POST = requirePermission(PERMISSIONS.PROJECT_MANAGE_SETTINGS, 'project', async (req, { params, session, resource }) => {
 *   // Safe to execute
 * });
 * 
 * @param {string} permission - The required permission from PERMISSIONS
 * @param {string} scope - 'org' | 'project'
 * @param {function} handler - The Next.js API handler
 */
export function requirePermission(permission, scope, handler) {
  return async (req, context) => {
    try {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await dbConnect();
      const params = await context.params;
      let hasAccess = false;
      let resource = null;

      // Extract ID depending on scope (orgId or projectId)
      // We assume the URL structure has /[scope]Id/ somewhere, or it's passed in body
      // Since request body can only be read once, we clone or handle parsing carefully.
      
      // For simplicity in GET/DELETE, we rely on params.id
      // For POST/PUT, we might need to parse body.
      let targetId = params?.id;
      
      if (!targetId && (req.method === 'POST' || req.method === 'PUT')) {
        // Warning: This means handler must use the cloned body or we pass the parsed body
        const clonedReq = req.clone();
        const body = await clonedReq.json().catch(() => ({}));
        targetId = scope === 'org' ? body.organizationId : body.projectId;
      }

      // If no target ID is found, we can't verify scope level permissions.
      // E.g., creating a project requires ORG_CREATE_PROJECT, which requires knowing the orgId.
      if (!targetId && permission) {
        // If they are acting on their personal namespace, we might allow it
        // But for strict RBAC, fail.
        if (scope === 'org') {
          // Check if they have personal org
          resource = await Organization.findOne({ 'members.user': session.userId, isPersonal: true });
          if (resource) {
             hasAccess = true; // Personal org bypass
          }
        }
      }

      if (targetId && scope === 'org') {
        resource = await Organization.findById(targetId);
        if (resource) {
          const member = resource.members.find(m => m.user.toString() === session.userId);
          if (member && hasPermission(member.role, permission, true)) {
            hasAccess = true;
          }
        }
      } else if (targetId && scope === 'project') {
        resource = await Project.findById(targetId);
        if (resource) {
          // Check project-level role first
          const projMember = resource.members.find(m => m.user.toString() === session.userId);
          if (projMember && hasPermission(projMember.role, permission, false)) {
            hasAccess = true;
          } else {
            // Fallback to org-level admin roles
            const org = await Organization.findById(resource.organization);
            if (org) {
              const orgMember = org.members.find(m => m.user.toString() === session.userId);
              // Org Owner/Admin generally have all project permissions implicitly
              if (orgMember && ['owner', 'admin'].includes(orgMember.role)) {
                hasAccess = true;
              }
            }
          }
        }
      }

      if (!hasAccess && permission) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }

      // Inject session and resource into context for the handler
      context.session = session;
      context.resource = resource;

      return handler(req, context);
    } catch (error) {
      console.error('RBAC Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}
