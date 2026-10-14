import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import { signToken, setAuthCookie } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req) {
  try {
    // Rate limit: 5 per hour per IP. Bulk account creation.
    const limited = await enforceRateLimit(req, { bucket: 'signup', limit: 5, windowSeconds: 3600 });
    if (limited) return limited;

    await dbConnect();
    const { name, email, username, password, inviteToken } = await req.json();

    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: 'User with email or username already exists' }, { status: 409 });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name,
      email,
      username,
      passwordHash,
    });

    // ─── CHECK FOR INVITE TOKEN ───
    // If user signed up from an invite link, join that org + project instead of creating a personal workspace
    let joinedOrg = null;
    let joinedProjectId = null;

    if (inviteToken) {
      const org = await Organization.findOne({
        'pendingInvites.token': inviteToken,
      });

      if (org) {
        const invite = org.pendingInvites.find(i => i.token === inviteToken && i.email === email);

        if (invite && new Date() < new Date(invite.expiresAt)) {
          // Add user to the org
          org.members.push({
            user: user._id,
            role: invite.role || 'member',
          });

          // Remove the used invite
          org.pendingInvites = org.pendingInvites.filter(i => i.token !== inviteToken);
          await org.save();

          // Link org to user
          user.organizations.push(org._id);
          joinedOrg = org;

          // Auto-add to project if invite has projectId
          if (invite.projectId) {
            const project = await Project.findById(invite.projectId);
            if (project) {
              const isProjectMember = project.members.some(m => m.user.toString() === user._id.toString());
              if (!isProjectMember) {
                project.members.push({
                  user: user._id,
                  role: invite.projectRole || 'member',
                  addedBy: invite.invitedBy,
                  joinedAt: new Date(),
                });
                await project.save();
                joinedProjectId = project._id;

                // Send notification
                await createNotification({
                  recipientId: user._id,
                  type: 'project_added',
                  title: 'Welcome to the project!',
                  message: `You've been added to "${project.name}"`,
                  link: `/dashboard/projects/${project._id}`,
                  actorId: invite.invitedBy,
                  metadata: { projectId: project._id, projectName: project.name },
                });
              }
            }
          }
        }
      }
    }

    // If no invite was processed, create a personal workspace
    if (!joinedOrg) {
      const orgSlug = username.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      const personalOrg = await Organization.create({
        name: `${name}'s Workspace`,
        slug: orgSlug,
        owner: user._id,
        members: [{ user: user._id, role: 'owner' }],
      });
      user.organizations.push(personalOrg._id);
    }

    await user.save();

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
      joinedProjectId: joinedProjectId || null,
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
