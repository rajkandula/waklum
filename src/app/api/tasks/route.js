import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });

    await dbConnect();

    // First find all projects the user has access to in this organization
    const projects = await Project.find({
      organization: orgId,
      'members.user': session.userId
    }).select('_id name color');

    const projectIds = projects.map(p => p._id);

    // Now find all tasks assigned to the user in these projects (primary or additional)
    const tasks = await Task.find({
      project: { $in: projectIds },
      $or: [
        { assignee: session.userId },
        { assignees: session.userId }
      ]
    }).populate('project', 'name color')
      .populate('assignee', 'name avatar')
      .populate('assignees', 'name avatar')
      .sort({ dueDate: 1, createdAt: -1 });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch user tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
