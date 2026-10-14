import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { getSession } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    await dbConnect();

    // Verify user belongs to the org
    const org = await Organization.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Fetch all projects for this org
    const projects = await Project.find({ organization: id });
    const projectIds = projects.map(p => p._id);

    // Fetch all tasks for these projects
    const tasks = await Task.find({ project: { $in: projectIds } });

    // Calculate basic metrics
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    
    // Status distribution
    const tasksByStatus = {
      todo: tasks.filter(t => t.columnId === 'todo').length,
      'in-progress': tasks.filter(t => t.columnId === 'in-progress').length,
      review: tasks.filter(t => t.columnId === 'review').length,
      done: tasks.filter(t => t.columnId === 'done').length,
    };

    // Calculate Completion Rate
    const completionRate = totalTasks > 0 
      ? Math.round((tasksByStatus.done / totalTasks) * 100) 
      : 0;

    // Active members (count unique users across projects)
    const uniqueMembers = new Set();
    projects.forEach(p => {
      p.members.forEach(m => uniqueMembers.add(m.user.toString()));
    });
    const activeMembers = uniqueMembers.size;

    // Project Distribution (Tasks per Project)
    const projectDistribution = projects.map(p => {
      const projectTasks = tasks.filter(t => t.project.toString() === p._id.toString());
      return {
        name: p.name,
        totalTasks: projectTasks.length,
        completedTasks: projectTasks.filter(t => t.columnId === 'done').length,
      };
    });

    return NextResponse.json({
      metrics: {
        totalProjects,
        totalTasks,
        completionRate,
        activeMembers
      },
      tasksByStatus: [
        { name: 'To Do', value: tasksByStatus.todo, color: '#94a3b8' },
        { name: 'In Progress', value: tasksByStatus['in-progress'], color: '#3b82f6' },
        { name: 'Review', value: tasksByStatus.review, color: '#eab308' },
        { name: 'Done', value: tasksByStatus.done, color: '#22c55e' },
      ],
      projectDistribution
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
