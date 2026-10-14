import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyAdmin } from '@/lib/admin';
import { PLAN_PRICES } from '@/lib/stripe';
import User from '@/models/User';

const PAID_PLANS = ['pro', 'team', 'enterprise'];

// GET /api/admin/subscriptions
// Billing overview sourced from User.subscription (the source of truth after
// the per-user billing migration). Returns revenue summary + a paginated,
// searchable list of billing customers.
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

    // Plan distribution across all users
    const planAgg = await User.aggregate([
      { $group: { _id: { $ifNull: ['$subscription.plan', 'free'] }, count: { $sum: 1 } } },
    ]);
    const planDistribution = planAgg.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {});

    // Active subscriptions = users with a live Stripe subscription id.
    // MRR is the sum of their plan prices.
    const activeSubs = await User.find({
      'subscription.stripeSubscriptionId': { $exists: true, $ne: null },
    }).select('subscription.plan').lean();

    const mrr = activeSubs.reduce((sum, u) => sum + (PLAN_PRICES[u.subscription?.plan] || 0), 0);

    // Billing customers = anyone with a Stripe customer record or a paid plan
    // (includes churned users who cancelled but retain a customer id).
    const billingFilter = {
      $or: [
        { 'subscription.stripeCustomerId': { $exists: true, $ne: null } },
        { 'subscription.plan': { $in: PAID_PLANS } },
      ],
    };

    const filter = search
      ? {
          $and: [
            billingFilter,
            { $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
            ]},
          ],
        }
      : billingFilter;

    const [rows, total] = await Promise.all([
      User.find(filter)
        .select('name email subscription createdAt')
        .sort({ 'subscription.currentPeriodEnd': -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const subscribers = rows.map((u) => {
      const s = u.subscription || {};
      const active = !!s.stripeSubscriptionId;
      const status = active ? 'active' : (s.stripeCustomerId ? 'canceled' : 'none');
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        plan: s.plan || 'free',
        status,
        mrr: active ? (PLAN_PRICES[s.plan] || 0) : 0,
        stripeCustomerId: s.stripeCustomerId || null,
        stripeSubscriptionId: s.stripeSubscriptionId || null,
        currentPeriodEnd: s.currentPeriodEnd || null,
        joinedAt: u.createdAt,
      };
    });

    const paidPlans = PAID_PLANS.reduce((sum, p) => sum + (planDistribution[p] || 0), 0);

    return NextResponse.json({
      summary: {
        mrr,
        arr: mrr * 12,
        activeSubscriptions: activeSubs.length,
        paidPlans,
        planDistribution,
      },
      subscribers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
