import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Activity from '@/models/Activity';
import { getSession } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const activities = await Activity.find({ 
      targetId: id,
      targetType: 'task'
    })
      .populate('actor', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
