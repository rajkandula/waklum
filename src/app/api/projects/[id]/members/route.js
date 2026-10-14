import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';
import User from '@/models/User';
import { createNotification } from '@/lib/notifications';
import { sendProjectAddedEmail, sendProjectInviteEmail } from '@/lib/email';

export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { email, role = 'member' } = await req.json();

    if (!email) return NextResponse.json({ error: 'Email address is required' }, { status: 400 });

    await dbConnect();

    // Verify current user has access to project and is admin/owner
    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const currentMember = project.members.find(m => m.user.toString() === session.userId);
    if (!['owner', 'admin'].includes(currentMember?.role) && project.createdBy.toString() !== session.userId) {
      return NextResponse.json({ error: 'Forbidden: Requires admin role' }, { status: 403 });
    }

    // Find user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!targetUser) {
      // ─── USER DOESN'T HAVE AN ACCOUNT ───
      // Create org-level pending invite WITH project context
      const org = await Organization.findById(project.organization);
      if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

      // Check if invite already sent for this email — remove old one and re-invite
      const existingInviteIdx = org.pendingInvites?.findIndex(i => i.email === email.toLowerCase().trim());
      if (existingInviteIdx !== undefined && existingInviteIdx >= 0) {
        // Remove old invite (may have stale schema) and create a fresh one below
        org.pendingInvites.splice(existingInviteIdx, 1);
      }

      const crypto = (await import('crypto')).default;
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      org.pendingInvites = org.pendingInvites || [];
      org.pendingInvites.push({
        email: email.toLowerCase().trim(),
        role: 'member',
        token,
        invitedBy: session.userId,
        invitedAt: new Date(),
        expiresAt,
        projectIds: [project._id],     // ← array of project IDs matching schema
        projectRole: role,
      });
      await org.save();

      // Send branded project invite email (fire-and-forget)
      const inviter = await User.findById(session.userId).select('name');
      sendProjectInviteEmail({
        to: email,
        inviterName: inviter?.name || 'A teammate',
        projectName: project.name,
        orgName: org.name,
        token,
      }).catch(emailError => console.error('Email failed (invite still saved):', emailError));

      return NextResponse.json({ 
        success: true, 
        message: `Invitation email sent to ${email}. They'll join "${project.name}" once they accept.`,
        isInvitation: true
      }, { status: 200 });
    }

    // ─── USER HAS AN ACCOUNT ───
    const userId = targetUser._id;

    // Check if user is in the organization, if not, add them
    const org = await Organization.findById(project.organization);
    const isOrgMember = org.members.find(m => m.user.toString() === userId.toString());
    
    if (!isOrgMember) {
      org.members.push({ user: userId, role: 'member', joinedAt: new Date() });
      await org.save();
      if (!targetUser.organizations.includes(org._id)) {
        targetUser.organizations.push(org._id);
        await targetUser.save();
      }
    }

    // Check if user is already in the project
    const existingMember = project.members.find(m => m.user.toString() === userId.toString());
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a project member' }, { status: 400 });
    }

    // Add user to project
    project.members.push({
      user: userId,
      role: role,
      addedBy: session.userId,
      joinedAt: new Date()
    });
    await project.save();

    // Send in-app notification (non-blocking)
    const inviter = await User.findById(session.userId).select('name');
    try {
      await createNotification({
        recipientId: userId,
        type: 'project_added',
        title: 'Added to project',
        message: `${inviter?.name || 'Someone'} added you to "${project.name}"`,
        link: `/dashboard/projects/${project._id}`,
        actorId: session.userId,
        metadata: { projectId: project._id, projectName: project.name },
      });
    } catch (notifError) {
      console.error('Notification creation failed (member still added):', notifError.message);
    }

    // Send email notification
    try {
      await sendProjectAddedEmail({
        to: targetUser.email,
        adderName: inviter?.name || 'A teammate',
        projectName: project.name,
        role: role,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${project._id}`,
      });
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    // Re-fetch project to populate member details
    const populatedProject = await Project.findById(id).populate('members.user', 'name email avatar');

    return NextResponse.json({ 
      success: true, 
      message: `${targetUser.name} has been added to the project and notified via email.`,
      member: populatedProject.members.find(m => m.user._id.toString() === userId.toString()) 
    }, { status: 201 });
  } catch (error) {
    console.error('Add member error:', error.message || error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: error.message || 'Failed to add member' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    await dbConnect();

    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const currentMember = project.members.find(m => m.user.toString() === session.userId);
    
    if (!['owner', 'admin'].includes(currentMember.role) && session.userId !== userId && project.createdBy.toString() !== session.userId) {
      return NextResponse.json({ error: 'Forbidden: Requires admin role to remove others' }, { status: 403 });
    }

    if (project.createdBy.toString() === userId) {
      return NextResponse.json({ error: 'Cannot remove the project creator' }, { status: 400 });
    }

    if (project.members.find(m => m.user.toString() === userId)?.role === 'owner') {
      const ownerCount = project.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
      }
    }

    project.members = project.members.filter(m => m.user.toString() !== userId);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
