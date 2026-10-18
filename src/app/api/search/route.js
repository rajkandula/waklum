import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: { projects: [], tasks: [], members: [] } });
    }

    await dbConnect();

    // Escaped so the query is matched literally, never run as a pattern.
    const searchRegex = new RegExp(q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Search projects the user has access to
    const projects = await Project.find({
      'members.user': session.userId,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ],
    })
      .select('name status slug color icon')
      .limit(5)
      .lean();

    // Search tasks in user's projects
    const userProjectIds = projects.map(p => p._id);
    const allUserProjects = await Project.find({ 'members.user': session.userId }).select('_id').lean();
    const allProjectIds = allUserProjects.map(p => p._id);

    const tasks = await Task.find({
      project: { $in: allProjectIds },
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { labels: searchRegex },
      ],
    })
      .select('title status priority project')
      .populate('project', 'name slug')
      .populate('assignee', 'name avatar')
      .limit(8)
      .lean();

    // Search members (users in same orgs) — only people who share a workspace
    // with the caller, never every account.
    const me = await User.findById(session.userId).select('organizations').lean();
    const members = await User.find({
      organizations: { $in: me?.organizations || [] },
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('name email username avatar')
      .limit(5)
      .lean();

    return NextResponse.json({
      results: { projects, tasks, members },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
