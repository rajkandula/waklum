import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyAdmin } from '@/lib/admin';
import { PLAN_PRICES } from '@/lib/stripe';
import User from '@/models/User';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import Task from '@/models/Task';
import Contact from '@/models/Contact';

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    const [totalUsers, totalOrgs, totalProjects, totalTasks, totalContacts, newContacts] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments(),
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
    ]);

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Plan distribution — sourced from User.subscription (billing lives on the
    // user after the per-user billing migration; Organization.plan is legacy).
    const planDist = await User.aggregate([
      { $group: { _id: { $ifNull: ['$subscription.plan', 'free'] }, count: { $sum: 1 } } }
    ]);
    const planDistribution = planDist.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {});

    // Recurring revenue from active subscriptions (users with a live Stripe sub)
    const activeSubs = await User.find({
      'subscription.stripeSubscriptionId': { $exists: true, $ne: null },
    }).select('subscription.plan').lean();
    const mrr = activeSubs.reduce((sum, u) => sum + (PLAN_PRICES[u.subscription?.plan] || 0), 0);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOrgs,
        totalProjects,
        totalTasks,
        totalContacts,
        newContacts,
        recentUsers,
        planDistribution,
        mrr,
        activeSubscriptions: activeSubs.length,
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
