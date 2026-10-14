import { S3Client } from '@aws-sdk/client-s3';

/**
 * File storage: any S3-compatible bucket, configured from the environment.
 *
 *   STORAGE_BUCKET             bucket name
 *   STORAGE_ACCESS_KEY_ID      access key with read/write on the bucket
 *   STORAGE_SECRET_ACCESS_KEY  its secret
 *   STORAGE_ENDPOINT           the provider's S3 API endpoint (https://...)
 *   STORAGE_PUBLIC_URL         public base URL objects are served from
 *   STORAGE_REGION             optional, defaults to "auto"
 *
 * Server-side only. Without these, uploads answer 503 with a clear message.
 */
const bucket = process.env.STORAGE_BUCKET;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const endpoint = process.env.STORAGE_ENDPOINT;
const publicUrl = (process.env.STORAGE_PUBLIC_URL || '').replace(/\/+$/, '');

export const isStorageConfigured = !!(bucket && accessKeyId && secretAccessKey && endpoint && publicUrl);

export const storageClient = isStorageConfigured
  ? new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

export const STORAGE_BUCKET = bucket;

/** The public URL of an object key. */
export function publicUrlFor(key) {
  return `${publicUrl}/${key}`;
}

export const STORAGE_NOT_CONFIGURED =
  'File storage is not configured. Set the STORAGE_* variables (see .env.example).';

/**
 * Largest single upload (project files and task attachments), kept well under
 * the smallest plan's total storage (500 MB, PLAN_LIMITS in ./stripe.js).
 * next.config.ts raises the proxy's request-body buffer to fit it.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TOO_LARGE = 'File is too large. The limit is 25 MB per file.';
