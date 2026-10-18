import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Doc from '@/models/Doc';
import { getSession } from '@/lib/auth';
import { isProjectMember } from '@/lib/rbac';

// GET — list all docs for a project
export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    await dbConnect();

    const docs = await Doc.find({ project: projectId })
      .populate('createdBy', 'name email avatar')
      .populate('lastEditedBy', 'name')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ docs });
  } catch (error) {
    console.error('Failed to fetch docs:', error);
    return NextResponse.json({ error: 'Failed to fetch docs' }, { status: 500 });
  }
}

// POST — create a new doc
export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const { title, content } = await req.json();

    await dbConnect();

    const doc = await Doc.create({
      title: title || 'Untitled',
      content: content || '',
      project: projectId,
      createdBy: session.userId,
      lastEditedBy: session.userId,
    });

    const populated = await Doc.findById(doc._id)
      .populate('createdBy', 'name email avatar');

    return NextResponse.json({ doc: populated }, { status: 201 });
  } catch (error) {
    console.error('Failed to create doc:', error);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
