import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession } from '@/lib/auth';
import { isProjectMember } from '@/lib/rbac';
import {
  storageClient, isStorageConfigured, STORAGE_BUCKET, publicUrlFor, STORAGE_NOT_CONFIGURED,
  MAX_UPLOAD_BYTES, UPLOAD_TOO_LARGE,
} from '@/lib/storage';

// Room for the multipart boundaries and the other form fields around the file.
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isStorageConfigured) {
      return NextResponse.json({ error: STORAGE_NOT_CONFIGURED }, { status: 503 });
    }

    // Refuse an oversized body before reading it.
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return NextResponse.json({ error: UPLOAD_TOO_LARGE }, { status: 413 });
    }

    let formData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
    }
    const file = formData.get('file');
    const projectId = formData.get('projectId');

    if (!(file instanceof Blob) || !projectId) {
      return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: UPLOAD_TOO_LARGE }, { status: 413 });
    }

    // Only members of the project may upload into it.
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Forbidden: not a member of this project' }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = (file.name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `projects/${projectId}/${Date.now()}-${sanitizedName}`;

    await storageClient.send(new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: file.type,
      Body: buffer,
    }));

    const publicUrl = publicUrlFor(key);

    return NextResponse.json({
      publicUrl,
      key,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
