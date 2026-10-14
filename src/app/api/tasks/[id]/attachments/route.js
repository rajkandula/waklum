import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Doc from '@/models/Doc';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const isId = (v) => typeof v === 'string' && mongoose.isObjectIdOrHexString(v);

/**
 * Load the task if the user may change its attachments: they must be a member
 * of the task's project, and either hold a project role that can edit tasks
 * (owner, admin, member; viewers are read-only) or be the task's creator,
 * reporter or an assignee (who may edit the task in PUT /api/tasks/[id]).
 * Returns { task } or { response } with the error to send.
 */
async function loadEditableTask(taskId, userId) {
  if (!isId(taskId)) {
    return { response: NextResponse.json({ error: 'Invalid task id' }, { status: 400 }) };
  }
  await dbConnect();

  const task = await Task.findById(taskId);
  if (!task) return { response: NextResponse.json({ error: 'Task not found' }, { status: 404 }) };

  const project = await Project.findOne({ _id: task.project, 'members.user': userId }).select('members').lean();
  const member = project?.members?.find(m => m.user?.toString() === userId);
  const isCreator = task.createdBy?.toString() === userId || task.reporter?.toString() === userId;
  const isAssignee = task.assignee?.toString() === userId || task.assignees?.some(a => a.toString() === userId);

  if (!member || !(hasPermission(member.role || '', PERMISSIONS.TASK_EDIT) || isCreator || isAssignee)) {
    return { response: NextResponse.json({ error: 'You do not have permission to edit this task' }, { status: 403 }) };
  }
  return { task };
}

const populated = (taskId) => Task.findById(taskId)
  .populate('linkedDocs', 'title updatedAt createdBy')
  .populate('attachments.uploadedBy', 'name');

// POST — add attachment or link doc to task
export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await params;
    const { task, response } = await loadEditableTask(taskId, session.userId);
    if (response) return response;

    const body = await req.json().catch(() => ({}));

    // Link a doc (only one from the same project)
    if (body.action === 'link-doc') {
      const { docId } = body;
      if (!isId(docId) || !(await Doc.exists({ _id: docId, project: task.project }))) {
        return NextResponse.json({ error: 'Doc not found in this project' }, { status: 400 });
      }
      if (!task.linkedDocs.some(d => d.toString() === docId)) {
        task.linkedDocs.push(docId);
        await task.save();
      }
      return NextResponse.json({ task: await populated(taskId) });
    }

    // Add file attachment
    if (body.action === 'add-attachment') {
      const { name, url, size, type: fileType } = body;
      if (!name || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'An attachment needs a name and an http(s) URL' }, { status: 400 });
      }
      task.attachments.push({
        name,
        url,
        size,
        fileType,
        uploadedBy: session.userId,
        uploadedAt: new Date(),
      });
      await task.save();
      return NextResponse.json({ task: await populated(taskId) });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Task attachments error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}

// DELETE — remove attachment or unlink doc
export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taskId } = await params;
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');
    const docId = searchParams.get('docId');

    if ((attachmentId && !isId(attachmentId)) || (docId && !isId(docId))) {
      return NextResponse.json({ error: 'Invalid attachmentId or docId' }, { status: 400 });
    }

    const { response } = await loadEditableTask(taskId, session.userId);
    if (response) return response;

    if (attachmentId) {
      await Task.findByIdAndUpdate(taskId, {
        $pull: { attachments: { _id: attachmentId } }
      });
    }

    if (docId) {
      await Task.findByIdAndUpdate(taskId, {
        $pull: { linkedDocs: docId }
      });
    }

    return NextResponse.json({ task: await populated(taskId) });
  } catch (error) {
    console.error('Task attachments delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
