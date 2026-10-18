import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Doc from '@/models/Doc';
import { getSession } from '@/lib/auth';
import { isProjectMember } from '@/lib/rbac';

// GET — single doc
export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, docId } = await params;
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    await dbConnect();

    const doc = await Doc.findOne({ _id: docId, project: projectId })
      .populate('createdBy', 'name email avatar')
      .populate('lastEditedBy', 'name');

    if (!doc) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });

    return NextResponse.json({ doc });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch doc' }, { status: 500 });
  }
}

// PUT — update a doc
export async function PUT(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, docId } = await params;
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    const updates = await req.json();

    await dbConnect();

    const doc = await Doc.findOneAndUpdate(
      { _id: docId, project: projectId },
      { 
        $set: { 
          ...updates, 
          lastEditedBy: session.userId 
        } 
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email avatar')
     .populate('lastEditedBy', 'name');

    if (!doc) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });

    return NextResponse.json({ doc });
  } catch (error) {
    console.error('Failed to update doc:', error);
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}

// DELETE — delete a doc
export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, docId } = await params;
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    await dbConnect();

    await Doc.findOneAndDelete({ _id: docId, project: projectId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 });
  }
}
