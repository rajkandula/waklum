import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Organization from '@/models/Organization';

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve the Stripe customer id. Accounts created after the User-based billing
    // migration store it on user.subscription; older subscribers have it on the
    // Organization they own — fall back to that and backfill the user so it's found
    // directly next time.
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const org = await Organization.findOne({
        owner: user._id,
        stripeCustomerId: { $exists: true, $ne: null },
      }).select('stripeCustomerId').lean();
      if (org?.stripeCustomerId) {
        customerId = org.stripeCustomerId;
        await User.findByIdAndUpdate(user._id, { 'subscription.stripeCustomerId': customerId });
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No billing history found for this account' }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
