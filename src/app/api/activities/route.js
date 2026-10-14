import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Activity from '@/models/Activity';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    await dbConnect();

    let query = {};

    // If no specific project is requested, fetch activities for all projects the user is part of
    if (projectId) {
      // Basic check
      const project = await Project.findById(projectId);
      if (!project || (!project.members.some(m => m.user.toString() === session.userId) && project.createdBy.toString() !== session.userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.project = projectId;
    } else {
      const userProjects = await Project.find({
        $or: [
          { 'members.user': session.userId },
          { createdBy: session.userId }
        ]
      }).select('_id');
      const projectIds = userProjects.map(p => p._id);
      query.project = { $in: projectIds };
    }

    const activities = await Activity.find(query)
      .populate('actor', 'name avatar')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
