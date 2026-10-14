import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const projects = await Project.find({
      organization: orgId,
      $or: [
        { createdBy: session.userId },
        { 'members.user': session.userId }
      ]
    }).populate('members.user', 'name avatar email').sort({ updatedAt: -1 });

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { name, description, tags, color, icon, organizationId } = await req.json();

    if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const project = await Project.create({
      name,
      description,
      slug,
      organization: organizationId,
      tags: tags || [],
      color: color || '#3b82f6',
      icon: icon || 'folder',
      columns: [
        { id: 'backlog', name: 'Backlog', color: '#64748b', order: 0 },
        { id: 'todo', name: 'To Do', color: '#3b82f6', order: 1 },
        { id: 'in-progress', name: 'In Progress', color: '#eab308', order: 2 },
        { id: 'review', name: 'Review', color: '#8b5cf6', order: 3 },
        { id: 'done', name: 'Done', color: '#22c55e', order: 4 },
      ],
      members: [{ user: session.userId, role: 'owner', addedBy: session.userId }],
      createdBy: session.userId,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
