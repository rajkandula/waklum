import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyAdmin } from '@/lib/admin';
import Organization from '@/models/Organization';
import Project from '@/models/Project';

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
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const [orgs, total] = await Promise.all([
      Organization.find(query)
        .populate('owner', 'name email avatar')
        .select('name slug plan owner members limits createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Organization.countDocuments(query),
    ]);

    // Get project counts per org
    const orgIds = orgs.map(o => o._id);
    const projectCounts = await Project.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } }
    ]);
    const projCountMap = projectCounts.reduce((acc, p) => ({ ...acc, [p._id.toString()]: p.count }), {});

    const enriched = orgs.map(o => ({
      ...o,
      memberCount: o.members?.length || 0,
      projectCount: projCountMap[o._id.toString()] || 0,
    }));

    return NextResponse.json({
      organizations: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin orgs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
