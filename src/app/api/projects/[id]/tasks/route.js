import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Comment from '@/models/Comment';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import User from '@/models/User';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await dbConnect();
    const tasks = await Task.find({ project: id })
      .populate('assignee', 'name avatar email')
      .populate('assignees', 'name avatar email')
      .sort({ order: 1, createdAt: -1 });

    // Get comment counts for all tasks in one query
    const taskIds = tasks.map(t => t._id);
    const commentCounts = await Comment.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: '$task', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    commentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    // Merge counts into task objects
    const tasksWithCounts = tasks.map(t => {
      const obj = t.toObject();
      obj.commentCount = countMap[t._id.toString()] || 0;
      return obj;
    });

    return NextResponse.json({ tasks: tasksWithCounts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();
    
    const body = await req.json();
    const { 
      title, description, columnId, priority, 
      assignee, dueDate, startDate, labels,
      estimatedHours 
    } = body;

    // Get max order in column to append to end
    const lastTask = await Task.findOne({ project: id, columnId }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description: description || '',
      project: id,
      columnId: columnId || 'todo',
      priority: priority || 'medium',
      assignee: assignee || undefined,
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      labels: labels || [],
      estimatedHours: estimatedHours || undefined,
      reporter: session.userId,
      createdBy: session.userId,
      order,
    });

    // Populate assignee for response
    await task.populate('assignee', 'name avatar email');

    // Send notification if someone was assigned
    if (assignee && assignee !== session.userId) {
      const actor = await User.findById(session.userId).select('name');
      const Project = (await import('@/models/Project')).default;
      const project = await Project.findById(id).select('name');

      await createNotification({
        recipientId: assignee,
        type: 'task_assigned',
        title: 'New task assigned',
        message: `${actor?.name || 'Someone'} assigned you "${title}" in ${project?.name || 'a project'}`,
        link: `/dashboard/projects/${id}`,
        actorId: session.userId,
        metadata: {
          projectId: id,
          projectName: project?.name,
          taskId: task._id,
          taskTitle: title,
        },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
