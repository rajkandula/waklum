import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// Map price IDs to plan names
function getPlanFromPriceId(priceId) {
  for (const [plan, id] of Object.entries(STRIPE_PRICES)) {
    if (id && id === priceId) return plan;
  }
  return 'pro'; // Default fallback
}

// Stripe moved `current_period_end` from the subscription top level onto each
// subscription item in API versions >= 2025-03-31. Read whichever exists and
// guard against undefined so we never store an Invalid Date.
function subscriptionPeriodEnd(subscription) {
  const raw = subscription?.current_period_end
    ?? subscription?.items?.data?.[0]?.current_period_end;
  return raw ? new Date(raw * 1000) : null;
}

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  await dbConnect();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (userId && subscriptionId) {
        // Fetch subscription to get the price ID and period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        await User.findByIdAndUpdate(userId, {
          'subscription.plan': plan,
          'subscription.stripeCustomerId': customerId,
          'subscription.stripeSubscriptionId': subscriptionId,
          'subscription.currentPeriodEnd': subscriptionPeriodEnd(subscription),
        });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = getPlanFromPriceId(priceId);

      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        {
          'subscription.plan': plan,
          'subscription.currentPeriodEnd': subscriptionPeriodEnd(subscription),
        }
      );
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        {
          'subscription.plan': 'free',
          'subscription.stripeSubscriptionId': null,
          'subscription.currentPeriodEnd': null,
        }
      );
    }
  } catch (err) {
    console.error('Webhook processing failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
