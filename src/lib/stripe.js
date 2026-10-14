import Stripe from 'stripe';

let _stripe;
export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return _stripe;
}

// Keep backward-compatible named export (lazy getter)
export const stripe = new Proxy({}, {
  get(_, prop) {
    return getStripe()[prop];
  },
});

// Stripe Price ids for the paid plans, from your own Stripe account
// (Dashboard → Product catalog → a monthly recurring Price per plan).
// Checkout only accepts these, and the webhook maps them back to a plan.
// Leave them empty to run without billing: upgrades then answer 503.
export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO || '',
  team: process.env.STRIPE_PRICE_TEAM || '',
};

export function isBillingConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Monthly price in USD per plan (keep in sync with your Stripe Prices).
// Used for revenue reporting in the admin dashboard.
export const PLAN_PRICES = {
  free: 0,
  pro: 6,
  team: 12,
  enterprise: 0,   // custom / contract-billed
};

export const PLAN_LIMITS = {
  free: {
    maxProjects: 2,
    maxMembers: 3,
    maxStorage: 524288000,       // 500MB
    aiCallsPerMonth: 50,
  },
  pro: {
    maxProjects: -1,             // Unlimited
    maxMembers: 25,
    maxStorage: 26843545600,     // 25GB
    aiCallsPerMonth: 500,
  },
  team: {
    maxProjects: -1,             // Unlimited
    maxMembers: -1,              // Unlimited
    maxStorage: 536870912000,    // 500GB
    aiCallsPerMonth: -1,         // Unlimited
  },
};
