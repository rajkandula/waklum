import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the org that has this invite token
    const org = await Organization.findOne({
      'pendingInvites.token': token,
    });

    if (!org) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    const invite = org.pendingInvites.find(i => i.token === token);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check expiry
    if (new Date() > new Date(invite.expiresAt)) {
      org.pendingInvites = org.pendingInvites.filter(i => i.token !== token);
      await org.save();
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    // The invite may name several projects (projectIds) or, in older invites, one (projectId).
    const inviteProjectIds = [...(invite.projectIds || []), ...(invite.projectId ? [invite.projectId] : [])]
      .map(String)
      .filter((id, i, all) => all.indexOf(id) === i);

    // Check if user exists with this email
    const user = await User.findOne({ email: invite.email });

    if (!user) {
      // User needs to sign up first — return invite details for the signup page
      return NextResponse.json({
        needsSignup: true,
        invite: {
          email: invite.email,
          role: invite.role,
          orgName: org.name,
          projectId: inviteProjectIds[0] || null,
          token,
        }
      });
    }

    // An invite link never signs anyone in. The invited account must already
    // be signed in; anyone else is asked to sign in as that account first.
    const session = await getSession();
    if (!session || session.userId !== user._id.toString()) {
      return NextResponse.json({
        needsLogin: true,
        email: invite.email,
        error: `Sign in as ${invite.email} to accept this invite.`,
      }, { status: 401 });
    }

    // User exists — add them to the org
    const alreadyMember = org.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) {
      // They're in the org already — but maybe not in the project
      // Still process the project join below
    } else {
      // Add user to org
      org.members.push({
        user: user._id,
        role: invite.role,
      });

      // Add org to user's organizations
      if (!user.organizations.includes(org._id)) {
        user.organizations.push(org._id);
        await user.save();
      }
    }

    // ─── AUTO-ADD TO EVERY PROJECT THE INVITE NAMES ───
    let projectName = null;
    for (const projectId of inviteProjectIds) {
      const project = await Project.findOne({ _id: projectId, organization: org._id });
      if (project) {
        projectName = projectName || project.name;
        const isProjectMember = project.members.some(m => m.user.toString() === user._id.toString());
        if (!isProjectMember) {
          project.members.push({
            user: user._id,
            role: invite.projectRole || 'member',
            addedBy: invite.invitedBy,
            joinedAt: new Date(),
          });
          await project.save();

          // Notify the user
          await createNotification({
            recipientId: user._id,
            type: 'project_added',
            title: 'Added to project',
            message: `You've been added to "${project.name}"`,
            link: `/dashboard/projects/${project._id}`,
            actorId: invite.invitedBy,
            metadata: { projectId: project._id, projectName: project.name },
          });
        }
      }
    }

    // Remove the used invite
    org.pendingInvites = org.pendingInvites.filter(i => i.token !== token);
    await org.save();

    return NextResponse.json({
      success: true,
      orgName: org.name,
      orgId: org._id,
      projectName,
      projectId: inviteProjectIds[0] || null,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}

// GET — fetch invite details without accepting
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await dbConnect();

    const org = await Organization.findOne({
      'pendingInvites.token': token,
    });

    if (!org) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    const invite = org.pendingInvites.find(i => i.token === token);

    if (!invite || new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    const inviter = await User.findById(invite.invitedBy).select('name');

    // If invite has a project, include project name
    let projectName = null;
    const firstProjectId = (invite.projectIds && invite.projectIds[0]) || invite.projectId;
    if (firstProjectId) {
      const project = await Project.findById(firstProjectId).select('name');
      projectName = project?.name || null;
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      orgName: org.name,
      inviterName: inviter?.name || 'A teammate',
      expiresAt: invite.expiresAt,
      projectName,
      projectId: firstProjectId || null,
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json({ error: 'Failed to get invite details' }, { status: 500 });
  }
}
