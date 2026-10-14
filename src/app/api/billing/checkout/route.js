import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES, isBillingConfigured } from '@/lib/stripe';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // The client names a plan; the Price comes from the server's own config, so
    // a caller can never check out against an arbitrary Price in the account.
    const { plan } = await req.json();

    if (!plan || !Object.hasOwn(STRIPE_PRICES, plan)) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    const priceId = STRIPE_PRICES[plan];
    if (!isBillingConfigured() || !priceId) {
      return NextResponse.json({ error: 'Billing is not configured on this server.' }, { status: 503 });
    }

    await dbConnect();
    const user = await User.findById(session.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user already has a Stripe customer ID, use it
    const customerOptions = user.subscription?.stripeCustomerId
      ? { customer: user.subscription.stripeCustomerId }
      : { customer_email: session.email };

    // Create Checkout Session tied to the user account
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      ...customerOptions,
      client_reference_id: user._id.toString(),
      metadata: {
        userId: user._id.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
