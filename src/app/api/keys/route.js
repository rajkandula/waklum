import dbConnect from '@/lib/db';
import { getSession } from '@/lib/auth';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';

// GET — List user's API keys (prefix only, never full key)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const keys = await ApiKey.find({ user: session.userId })
      .select('prefix name lastUsedAt createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST — Generate a new API key (returns full key ONCE)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const name = body.name || 'API Key';

    // Limit to 5 keys per user
    const count = await ApiKey.countDocuments({ user: session.userId });
    if (count >= 5) {
      return NextResponse.json({ error: 'Maximum 5 API keys allowed' }, { status: 400 });
    }

    const { key, prefix, hash } = ApiKey.generateKey();

    await ApiKey.create({
      key: hash,
      prefix,
      name,
      user: session.userId,
    });

    // Return the full key ONLY this one time
    return NextResponse.json({ key, prefix, name, message: 'Save this key — you won\'t see it again.' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// DELETE — Revoke an API key
export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) return NextResponse.json({ error: 'Key ID required' }, { status: 400 });

    await dbConnect();
    const result = await ApiKey.findOneAndDelete({ _id: keyId, user: session.userId });

    if (!result) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
