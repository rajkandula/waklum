import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSession } from '@/lib/auth';
import { isProjectMember } from '@/lib/rbac';
import {
  storageClient, isStorageConfigured, STORAGE_BUCKET, publicUrlFor, STORAGE_NOT_CONFIGURED,
  MAX_UPLOAD_BYTES, UPLOAD_TOO_LARGE,
} from '@/lib/storage';

// Issues a presigned PUT URL for a direct-to-bucket upload. The app's own UI
// uploads through /api/upload/direct instead; this stays for API clients.
export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isStorageConfigured) {
      return NextResponse.json({ error: STORAGE_NOT_CONFIGURED }, { status: 503 });
    }

    const { filename, contentType, projectId, size } = await req.json();

    if (!filename || !contentType || !projectId || !Number.isInteger(size) || size < 0) {
      return NextResponse.json({ error: 'Missing required parameters (filename, contentType, projectId, size)' }, { status: 400 });
    }

    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: UPLOAD_TOO_LARGE }, { status: 413 });
    }

    // Only members of the project may upload into it.
    if (!(await isProjectMember(projectId, session.userId))) {
      return NextResponse.json({ error: 'Forbidden: not a member of this project' }, { status: 403 });
    }

    // Sanitize filename and create unique key
    const sanitizedName = String(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `projects/${projectId}/${Date.now()}-${sanitizedName}`;

    // ContentLength is part of the signature, so the bucket refuses a PUT of
    // any other size than the one checked above.
    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    // Generate presigned URL valid for 5 minutes (300 seconds)
    const signedUrl = await getSignedUrl(storageClient, command, { expiresIn: 300 });

    const publicUrl = publicUrlFor(key);

    return NextResponse.json({
      signedUrl,
      publicUrl,
      key
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
