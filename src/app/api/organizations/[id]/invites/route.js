import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Project from '@/models/Project';
import Notification from '@/models/Notification';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { sendInviteEmail } from '@/lib/email';
import crypto from 'crypto';

// Only Org Admins/Owners can invite members
export const POST = requirePermission(PERMISSIONS.ORG_INVITE_MEMBERS, 'org', async (req, { params, session, resource: org }) => {
  try {
    const { email, role, projectIds } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'member', 'manager', 'guest'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists and is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isMember = org.members.some(m => m.user.toString() === existingUser._id.toString());
      if (isMember) {
        // User is already org member — just add to projects if specified
        if (projectIds?.length > 0) {
          const addedToProjects = [];
          for (const projectId of projectIds) {
            const project = await Project.findOne({ 
              _id: projectId, 
              organization: org._id 
            });
            if (project) {
              const alreadyMember = project.members.some(
                m => m.user.toString() === existingUser._id.toString()
              );
              if (!alreadyMember) {
                project.members.push({
                  user: existingUser._id,
                  role: 'member',
                  addedBy: session.userId
                });
                await project.save();
                addedToProjects.push(project.name);
              }
            }
          }
          if (addedToProjects.length > 0) {
            return NextResponse.json({ 
              success: true, 
              message: `Added to ${addedToProjects.length} project(s): ${addedToProjects.join(', ')}` 
            });
          }
        }
        return NextResponse.json({ error: 'This user is already a member of this workspace' }, { status: 400 });
      }

      // User exists but is NOT an org member — create a pending invite (don't auto-add)
      const inviteExists = org.pendingInvites?.some(invite => invite.email === email);
      if (inviteExists) {
        return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      org.pendingInvites = org.pendingInvites || [];
      org.pendingInvites.push({
        email,
        role,
        token,
        projectIds: projectIds || [],
        invitedBy: session.userId,
        invitedAt: new Date(),
        expiresAt
      });
      await org.save();

      // Create a notification for the existing user so they can accept/decline
      const inviter = await User.findById(session.userId);
      try {
        await Notification.create({
          recipient: existingUser._id,
          type: 'workspace_invite',
          title: `Invitation to join ${org.name}`,
          message: `${inviter?.name || 'Someone'} invited you to join "${org.name}" as ${role}.`,
          actor: session.userId,
          metadata: {
            orgId: org._id,
            orgName: org.name,
            inviteRole: role,
            inviteToken: token,
          },
          link: `/dashboard?acceptInvite=${token}&orgId=${org._id}`,
        });
      } catch (notifErr) {
        console.error('Notification create failed (invite still saved):', notifErr);
      }

      // Try sending email
      try {
        await sendInviteEmail({
          to: email,
          inviterName: inviter?.name || 'A teammate',
          orgName: org.name,
          role,
          token,
        });
      } catch (emailError) {
        console.error('Email send failed (invite still saved):', emailError);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Invitation sent to ${existingUser.name}. They will need to accept to join.`,
        pendingInvite: true
      }, { status: 201 });
    }

    // User does NOT exist — create a pending invite
    const inviteExists = org.pendingInvites?.some(invite => invite.email === email);
    if (inviteExists) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const newInvite = {
      email,
      role,
      token,
      projectIds: projectIds || [],
      invitedBy: session.userId,
      invitedAt: new Date(),
      expiresAt
    };

    org.pendingInvites = org.pendingInvites || [];
    org.pendingInvites.push(newInvite);
    
    await org.save();

    // Send the invite email
    const inviter = await User.findById(session.userId);
    try {
      await sendInviteEmail({
        to: email,
        inviterName: inviter?.name || 'A teammate',
        orgName: org.name,
        role,
        token,
      });
    } catch (emailError) {
      console.error('Email send failed (invite still saved):', emailError);
      // Don't fail the invite if email fails — the invite is saved in DB
    }

    return NextResponse.json({ success: true, invite: newInvite }, { status: 201 });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
});

// DELETE /api/organizations/[id]/invites?email=xxx
// Cancel a pending invite
export async function DELETE(req, { params }) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Check requester is owner/admin
    const requester = org.members.find(m => m.user.toString() === session.userId);
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return NextResponse.json({ error: 'Only owners and admins can cancel invites' }, { status: 403 });
    }

    const before = org.pendingInvites?.length || 0;
    org.pendingInvites = (org.pendingInvites || []).filter(invite => invite.email !== email);
    const after = org.pendingInvites.length;

    if (before === after) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    await org.save();

    return NextResponse.json({ success: true, message: `Invite to ${email} has been cancelled.` });
  } catch (error) {
    console.error('Cancel invite error:', error);
    return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
  }
}
