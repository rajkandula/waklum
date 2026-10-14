import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import Activity from '@/models/Activity';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { sendTaskAssignmentEmail } from '@/lib/email';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const task = await Task.findById(id)
      .populate('assignee', 'name avatar email')
      .populate('assignees', 'name avatar email')
      .populate('reporter', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('project', 'name slug')
      .populate('linkedDocs', 'title updatedAt createdBy')
      .populate('attachments.uploadedBy', 'name');

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();
    
    const updates = await req.json();

    // Get previous task state for comparison
    const previousTask = await Task.findById(id);
    if (!previousTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── Permission Check ───
    // Allowed: task creator, task assignee(s), project owner/admin, org owner/admin
    const userId = session.userId;
    const isCreator = previousTask.createdBy?.toString() === userId || previousTask.reporter?.toString() === userId;
    const isAssignee = previousTask.assignee?.toString() === userId || previousTask.assignees?.some(a => a.toString() === userId);
    
    let isProjectAdmin = false;
    const project = await Project.findById(previousTask.project);
    if (project) {
      const projectMember = project.members?.find(m => m.user.toString() === userId);
      isProjectAdmin = projectMember && ['owner', 'admin'].includes(projectMember.role);
    }

    // Assignees can change status, log hours, manage co-assignees, and subtasks
    const isStatusOnlyUpdate = Object.keys(updates).every(k => ['status', 'columnId', 'loggedHours', 'estimatedHours', 'assignees', 'subtasks'].includes(k));
    
    if (!isCreator && !isProjectAdmin) {
      if (!isAssignee) {
        return NextResponse.json({ error: 'You do not have permission to edit this task' }, { status: 403 });
      }
      // Assignees can only update status and log hours
      if (!isStatusOnlyUpdate) {
        return NextResponse.json({ error: 'You can only change the status or log hours for tasks assigned to you' }, { status: 403 });
      }
    }

    // Sync columnId with status when status changes
    // The column IDs match status names (backlog, todo, in-progress, review, done)
    if (updates.status && !updates.columnId) {
      updates.columnId = updates.status;
    }
    // And vice versa — if columnId changes, sync status
    if (updates.columnId && !updates.status) {
      updates.status = updates.columnId;
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'name avatar email')
      .populate('assignees', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .populate('reporter', 'name avatar');

    // ─── Activity Logging ───
    const logActivity = (action, metadata) => {
      Activity.create({
        project: task.project,
        actor: session.userId,
        action,
        targetType: 'task',
        targetId: id,
        metadata,
      }).catch(err => console.error('Activity log failed:', err));
    };

    if (updates.status && updates.status !== previousTask.status) {
      logActivity('status_changed', {
        from: previousTask.status,
        to: updates.status,
        taskTitle: task.title,
      });
    }

    if (updates.priority && updates.priority !== previousTask.priority) {
      logActivity('priority_changed', {
        from: previousTask.priority,
        to: updates.priority,
        taskTitle: task.title,
      });
    }

    if (updates.assignee && updates.assignee !== previousTask.assignee?.toString()) {
      logActivity('assignee_changed', {
        from: previousTask.assignee?.toString() || null,
        to: updates.assignee,
        taskTitle: task.title,
        assigneeName: task.assignee?.name,
      });
    }

    // Send notification if assignee changed
    if (updates.assignee && updates.assignee !== previousTask.assignee?.toString()) {
      const project = await Project.findById(task.project).select('name slug');
      const actor = await User.findById(session.userId).select('name');
      const assignee = await User.findById(updates.assignee).select('name email');

      if (assignee) {
        // In-app notification
        await createNotification({
          recipientId: updates.assignee,
          type: 'task_assigned',
          title: 'New task assigned',
          message: `${actor?.name || 'Someone'} assigned you "${task.title}" in ${project?.name || 'a project'}`,
          link: `/dashboard/projects/${task.project}`,
          actorId: session.userId,
          metadata: {
            projectId: task.project,
            projectName: project?.name,
            taskId: task._id,
            taskTitle: task.title,
          },
        });

        // Email notification (fire-and-forget)
        sendTaskAssignmentEmail({
          to: assignee.email,
          assignerName: actor?.name || 'A teammate',
          taskTitle: task.title,
          projectName: project?.name || 'a project',
          taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${task.project}`,
        }).catch(err => console.error('Assignment email failed:', err));
      }
    }

    // Send notifications when additional assignees are added
    if (updates.assignees) {
      const prevAssigneeIds = (previousTask.assignees || []).map(a => a.toString());
      const newAssigneeIds = updates.assignees.filter(id => !prevAssigneeIds.includes(id.toString()));
      
      if (newAssigneeIds.length > 0) {
        const project = await Project.findById(task.project).select('name slug');
        const actor = await User.findById(session.userId).select('name');
        
        // Log activity
        logActivity('assignees_added', {
          added: newAssigneeIds,
          taskTitle: task.title,
        });

        // Notify each new assignee
        for (const newId of newAssigneeIds) {
          if (newId.toString() === session.userId) continue; // Don't notify yourself
          await createNotification({
            recipientId: newId,
            type: 'task_assigned',
            title: 'Added to task',
            message: `${actor?.name || 'Someone'} added you to "${task.title}" in ${project?.name || 'a project'}`,
            link: `/dashboard/projects/${task.project}`,
            actorId: session.userId,
            metadata: {
              projectId: task.project,
              projectName: project?.name,
              taskId: task._id,
              taskTitle: task.title,
            },
          });
        }
      }
    }
    // ─── Status-Change Notifications ───
    if (updates.status && updates.status !== previousTask.status) {
      const project = await Project.findById(task.project).select('name slug');
      const actor = await User.findById(session.userId).select('name');
      const actorName = actor?.name || 'Someone';
      const projName = project?.name || 'a project';
      const taskLink = `/dashboard/projects/${task.project}`;
      const meta = { projectId: task.project, projectName: projName, taskId: task._id, taskTitle: task.title };

      // Helper: notify a user (skip self)
      const notify = async (recipientId, title, message) => {
        if (!recipientId || recipientId.toString() === session.userId) return;
        await createNotification({ recipientId, type: 'task_updated', title, message, link: taskLink, actorId: session.userId, metadata: meta });
      };

      // Moved to REVIEW → notify creator that work is ready for review
      if (updates.status === 'review') {
        await notify(previousTask.reporter || previousTask.createdBy, 'Task ready for review', `${actorName} moved "${task.title}" to review in ${projName}`);
      }

      // Moved BACK to IN-PROGRESS (review rejected) → notify the primary assignee
      if (updates.status === 'in-progress' && previousTask.status === 'review') {
        await notify(previousTask.assignee, 'Changes requested', `${actorName} sent "${task.title}" back to in-progress — check comments for details`);
      }

      // Moved to DONE → notify creator AND primary assignee
      if (updates.status === 'done') {
        await notify(previousTask.reporter || previousTask.createdBy, 'Task completed', `${actorName} marked "${task.title}" as done`);
        // Also notify the primary assignee if someone else marked it done
        if (previousTask.assignee?.toString() !== (previousTask.reporter || previousTask.createdBy)?.toString()) {
          await notify(previousTask.assignee, 'Task completed', `${actorName} marked "${task.title}" as done`);
        }
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Permission check: only creator, project owner/admin can delete
    const userId = session.userId;
    const isCreator = task.createdBy?.toString() === userId || task.reporter?.toString() === userId;
    let isProjectAdmin = false;
    const project = await Project.findById(task.project);
    if (project) {
      const pm = project.members?.find(m => m.user.toString() === userId);
      isProjectAdmin = pm && ['owner', 'admin'].includes(pm.role);
    }

    if (!isCreator && !isProjectAdmin) {
      return NextResponse.json({ error: 'Only the task creator or project admin can delete tasks' }, { status: 403 });
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
