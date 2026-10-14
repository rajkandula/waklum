import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyAdmin } from '@/lib/admin';
import User from '@/models/User';
import Organization from '@/models/Organization';

export async function GET(req) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    await dbConnect();

    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
        ]}
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email username avatar authProvider subscription createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Get org counts per user
    const userIds = users.map(u => u._id);
    const orgCounts = await Organization.aggregate([
      { $unwind: '$members' },
      { $match: { 'members.user': { $in: userIds } } },
      { $group: { _id: '$members.user', count: { $sum: 1 } } }
    ]);
    const orgCountMap = orgCounts.reduce((acc, o) => ({ ...acc, [o._id.toString()]: o.count }), {});

    const enriched = users.map(u => ({
      ...u,
      orgCount: orgCountMap[u._id.toString()] || 0,
    }));

    return NextResponse.json({
      users: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
