import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RateLimit from '@/models/RateLimit';

/**
 * Best-effort client identifier: the address your platform or reverse proxy
 * forwards. Only trust these headers behind a proxy that sets them itself.
 */
export function getClientIp(req) {
  const h = req.headers;
  return (
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

/**
 * Fixed-window counter, kept in MongoDB so every server instance shares it.
 *
 * The update is a single atomic aggregation pipeline: if the stored window has
 * lapsed it resets to 1, otherwise it increments. That avoids the read-then-write
 * race two concurrent requests would otherwise hit.
 *
 * Returns { allowed, remaining, retryAfter }.
 */
export async function checkRateLimit({ key, limit, windowSeconds }) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000);

  const doc = await RateLimit.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: { $cond: [{ $gt: ['$expiresAt', now] }, { $add: ['$count', 1] }, 1] },
          expiresAt: { $cond: [{ $gt: ['$expiresAt', now] }, '$expiresAt', windowEnd] },
        },
      },
    ],
    // Mongoose 9 requires updatePipeline for an aggregation-pipeline update.
    { new: true, upsert: true, updatePipeline: true }
  );

  const count = doc?.count ?? 1;
  const resetAt = doc?.expiresAt ?? windowEnd;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}

/**
 * Guard for a route handler. Returns a 429 NextResponse to return early, or null
 * to continue.
 *
 * Deliberately fails OPEN: if the datastore is unreachable we let the request
 * through rather than locking every user out of sign-in during an outage.
 */
export async function enforceRateLimit(req, { bucket, limit, windowSeconds, identifier }) {
  try {
    await dbConnect();
    const client = identifier || getClientIp(req);
    const { allowed, remaining, retryAfter } = await checkRateLimit({
      key: `${bucket}:${client}`,
      limit,
      windowSeconds,
    });

    if (allowed) return null;

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(limit),
          'RateLimit-Remaining': String(remaining),
        },
      }
    );
  } catch (err) {
    console.error('Rate limit check failed, allowing request:', err);
    return null;
  }
}
