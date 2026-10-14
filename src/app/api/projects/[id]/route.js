import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { getSession } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await dbConnect();

    const project = await Project.findById(id).populate('members.user', 'name avatar email');
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = project.members.some(m => m.user._id.toString() === session.userId);
    if (!isMember && project.createdBy.toString() !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    await dbConnect();

    // Verify access
    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Check if user is admin or owner
    const member = project.members.find(m => m.user.toString() === session.userId);
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden: Requires admin role' }, { status: 403 });
    }

    // Update fields
    const allowedFields = ['name', 'description', 'visibility', 'color', 'columns'];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        project[field] = body[field];
      }
    });

    await project.save();

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    await dbConnect();

    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Only creator/owner can delete
    const member = project.members.find(m => m.user.toString() === session.userId);
    if (project.createdBy.toString() !== session.userId && member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only the project creator or owner can delete the project' }, { status: 403 });
    }

    await Project.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}


