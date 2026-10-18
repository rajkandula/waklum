import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import Task from '@/models/Task';
import User from '@/models/User';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import { isTaskProjectMember } from '@/lib/rbac';
import { createBulkNotifications } from '@/lib/notifications';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!(await isTaskProjectMember(id, session.userId))) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    await dbConnect();

    const comments = await Comment.find({ task: id })
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!(await isTaskProjectMember(id, session.userId))) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await dbConnect();

    const comment = await Comment.create({
      task: id,
      author: session.userId,
      content
    });

    await comment.populate('author', 'name avatar');

    // Send notifications to task assignee and reporter
    const task = await Task.findById(id).select('title assignee reporter project');
    if (task) {
      const actor = await User.findById(session.userId).select('name');
      const project = await Project.findById(task.project).select('name');
      
      const recipients = new Set();
      if (task.assignee) recipients.add(task.assignee.toString());
      if (task.reporter) recipients.add(task.reporter.toString());
      // Don't notify the commenter
      recipients.delete(session.userId);

      if (recipients.size > 0) {
        const notifications = [...recipients].map(recipientId => ({
          recipientId,
          type: 'comment_added',
          title: 'New comment',
          message: `${actor?.name || 'Someone'} commented on "${task.title}"`,
          link: `/dashboard/projects/${task.project}`,
          actorId: session.userId,
          metadata: {
            projectId: task.project,
            projectName: project?.name,
            taskId: task._id,
            taskTitle: task.title,
          },
        }));

        createBulkNotifications(notifications).catch(err => 
          console.error('Comment notification failed:', err)
        );
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
