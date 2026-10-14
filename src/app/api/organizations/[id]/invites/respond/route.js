import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Project from '@/models/Project';
import Notification from '@/models/Notification';

// POST /api/organizations/[id]/invites/respond
// Accept or decline an invite
export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const { token, action } = await req.json(); // action: 'accept' or 'decline'

    if (!token || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Token and action (accept/decline) are required' }, { status: 400 });
    }

    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Find the invite
    const inviteIdx = org.pendingInvites?.findIndex(inv => inv.token === token);
    if (inviteIdx === -1 || inviteIdx === undefined) {
      return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
    }

    const invite = org.pendingInvites[inviteIdx];

    // Verify the invite is for this user
    const currentUser = await User.findById(session.userId);
    if (!currentUser || currentUser.email !== invite.email) {
      return NextResponse.json({ error: 'This invite is not for your account' }, { status: 403 });
    }

    // Check expiry
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      // Remove expired invite
      org.pendingInvites.splice(inviteIdx, 1);
      await org.save();
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    if (action === 'decline') {
      // Remove the invite
      org.pendingInvites.splice(inviteIdx, 1);
      await org.save();

      // Mark related notification as read
      await Notification.updateMany(
        { recipient: session.userId, 'metadata.inviteToken': token },
        { read: true }
      );

      return NextResponse.json({ success: true, message: 'Invite declined.' });
    }

    // Accept: Add user to org
    const alreadyMember = org.members.some(m => m.user.toString() === session.userId);
    if (!alreadyMember) {
      org.members.push({
        user: session.userId,
        role: invite.role || 'member',
        addedBy: invite.invitedBy,
        joinedAt: new Date()
      });
    }

    // Add to specified projects
    if (invite.projectIds?.length > 0) {
      for (const projectId of invite.projectIds) {
        const project = await Project.findOne({ _id: projectId, organization: org._id });
        if (project) {
          const alreadyInProject = project.members.some(
            m => m.user.toString() === session.userId
          );
          if (!alreadyInProject) {
            project.members.push({
              user: session.userId,
              role: 'member',
              addedBy: invite.invitedBy
            });
            await project.save();
          }
        }
      }
    }

    // Remove the pending invite
    org.pendingInvites.splice(inviteIdx, 1);
    await org.save();

    // Add org to user's organizations array
    await User.findByIdAndUpdate(session.userId, {
      $addToSet: { organizations: org._id }
    });

    // Mark notification as read
    await Notification.updateMany(
      { recipient: session.userId, 'metadata.inviteToken': token },
      { read: true }
    );

    // Notify the inviter that their invite was accepted
    try {
      await Notification.create({
        recipient: invite.invitedBy,
        type: 'invite_accepted',
        title: `${currentUser.name} joined ${org.name}`,
        message: `${currentUser.name} accepted your invitation to join "${org.name}".`,
        actor: session.userId,
        metadata: { orgId: org._id },
      });
    } catch (e) {
      // Non-critical
    }

    return NextResponse.json({ 
      success: true, 
      message: `You have joined ${org.name}!` 
    });
  } catch (error) {
    console.error('Respond to invite error:', error);
    return NextResponse.json({ error: 'Failed to process invite' }, { status: 500 });
  }
}
