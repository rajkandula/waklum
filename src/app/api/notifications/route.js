import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User'; // Required: register User schema for populate
import { getSession } from '@/lib/auth';

// GET — fetch notifications for current user
export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const unreadOnly = searchParams.get('unread') === 'true';

    const query = { recipient: session.userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name avatar')
      .lean();

    const unreadCount = await Notification.countDocuments({ 
      recipient: session.userId, 
      read: false 
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PUT — mark notifications as read
export async function PUT(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { ids, markAll } = await req.json();

    if (markAll) {
      await Notification.updateMany(
        { recipient: session.userId, read: false, type: { $ne: 'workspace_invite' } },
        { read: true }
      );
    } else if (ids?.length) {
      await Notification.updateMany(
        { _id: { $in: ids }, recipient: session.userId },
        { read: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
