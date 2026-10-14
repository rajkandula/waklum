import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

export async function POST(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, url, key, size, type, folder, isFolder } = body;

    await dbConnect();

    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // Handle folder creation
    if (isFolder || type === 'folder') {
      // Check if folder already exists
      const folderExists = project.files.some(f => 
        f.isFolder && f.name === name && f.folder === (folder || '/')
      );
      if (folderExists) {
        return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
      }

      const newFolder = {
        name,
        type: 'folder',
        isFolder: true,
        folder: folder || '/',
        uploadedBy: session.userId,
        uploadedAt: new Date()
      };

      project.files.push(newFolder);
      await project.save();

      const savedFolder = project.files[project.files.length - 1];
      return NextResponse.json({ file: savedFolder }, { status: 201 });
    }

    // Handle file metadata save
    const newFile = {
      name,
      url,
      key,
      size,
      type,
      folder: folder || '/',
      uploadedBy: session.userId,
      uploadedAt: new Date()
    };

    project.files.push(newFile);
    await project.save();

    // Return the file with its generated _id
    const savedFile = project.files[project.files.length - 1];
    return NextResponse.json({ file: savedFile }, { status: 201 });
  } catch (error) {
    console.error('Failed to save file info:', error);
    return NextResponse.json({ error: 'Failed to save file information' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    await dbConnect();

    const project = await Project.findOne({
      _id: id,
      'members.user': session.userId
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    const file = project.files.id(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const member = project.members.find(m => m.user.toString() === session.userId);
    if (file.uploadedBy.toString() !== session.userId && member.role !== 'owner' && member.role !== 'admin') {
       return NextResponse.json({ error: 'Not authorized to delete this file' }, { status: 403 });
    }

    project.files.pull(fileId);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
