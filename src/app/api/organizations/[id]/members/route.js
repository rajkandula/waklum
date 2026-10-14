import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import User from '@/models/User';

// DELETE /api/organizations/[id]/members?userId=xxx
// Remove a member from the organization and all its projects
export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Check that the requester is the owner or admin
    const requester = org.members.find(m => m.user.toString() === session.userId);
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Prevent removing yourself
    if (userIdToRemove === session.userId) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    // Prevent removing another owner
    const targetMember = org.members.find(m => m.user.toString() === userIdToRemove);
    if (targetMember && targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove an owner' }, { status: 403 });
    }

    // Remove from organization
    org.members = org.members.filter(m => m.user.toString() !== userIdToRemove);
    await org.save();

    // Remove from all projects in this org
    await Project.updateMany(
      { organization: id },
      { $pull: { members: { user: userIdToRemove } } }
    );

    // Remove org from user's organizations list
    await User.findByIdAndUpdate(userIdToRemove, {
      $pull: { organizations: id }
    });

    return NextResponse.json({ success: true, message: 'Member removed from organization and all projects.' });
  } catch (error) {
    console.error('Remove org member error:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}

// PATCH /api/organizations/[id]/members
// Update a member's role
export async function PATCH(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'member', 'guest'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Only owner can change roles
    const requester = org.members.find(m => m.user.toString() === session.userId);
    if (!requester || requester.role !== 'owner') {
      return NextResponse.json({ error: 'Only workspace owners can change member roles' }, { status: 403 });
    }

    // Cannot change your own role
    if (userId === session.userId) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    // Cannot change another owner's role
    const targetMember = org.members.find(m => m.user.toString() === userId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change an owner\'s role' }, { status: 403 });
    }

    // Update the role
    targetMember.role = role;
    await org.save();

    return NextResponse.json({ success: true, message: `Role updated to ${role}` });
  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update role' }, { status: 500 });
  }
}
