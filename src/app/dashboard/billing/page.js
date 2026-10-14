"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, CreditCard, Zap, Receipt, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    key: 'free',
    price: '$0',
    description: 'Perfect for individuals getting started.',
    features: [
      '1 workspace',
      'Up to 2 projects',
      'Up to 3 team members',
      '500 MB storage',
      '50 AI calls/month',
      'MCP connector (100 calls/mo)',
    ],
    checkoutPlan: null,
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '$6',
    description: 'For growing teams needing advanced features.',
    features: [
      'Up to 3 workspaces',
      'Unlimited projects',
      'Up to 25 members',
      '25 GB storage',
      '500 AI calls/month',
      'MCP connector (1,000 calls/mo)',
      'AI docs & smart context',
      'Timeline & analytics',
    ],
    checkoutPlan: 'pro',
  },
  {
    name: 'Team',
    key: 'team',
    price: '$12',
    description: 'For organizations & agencies with complex needs.',
    features: [
      'Unlimited workspaces',
      'Everything in Pro',
      'Unlimited members',
      '500 GB storage',
      'Unlimited AI calls',
      'Unlimited MCP calls',
    ],
    checkoutPlan: 'team',
  }
];

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(null);

  const currentPlan = user?.subscription?.plan || 'free';

  // After returning from Stripe checkout, the plan is applied asynchronously by
  // the webhook — poll a few times so the page reflects the new plan without a
  // manual reload.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('success')) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled || attempts >= 5) return;
      attempts += 1;
      await refreshUser?.();
      if (!cancelled) setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [refreshUser]);

  const handleUpgrade = async (checkoutPlan) => {
    setIsProcessing(checkoutPlan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: checkoutPlan })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start checkout');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleManageBilling = async () => {
    setIsProcessing('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-surface-100">Billing & Subscriptions</h2>
        <p className="text-surface-400 mt-2">Manage your account plan and billing information.</p>
      </div>

      {/* Current Plan Alert */}
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-brand-600">
          <Zap className="h-5 w-5" />
          <div>
            <h4 className="font-semibold text-surface-100">
              You&apos;re on the <span className="capitalize">{currentPlan}</span> plan
            </h4>
            <p className="text-sm">
              {currentPlan === 'free'
                ? 'Upgrade to unlock more features and higher limits.'
                : 'Your subscription applies to all your workspaces and organizations.'}
            </p>
          </div>
        </div>
        {currentPlan !== 'free' && (
          <Button 
            variant="outline" 
            className="border-brand-500/20 hover:bg-brand-500/20 text-brand-600 shrink-0"
            onClick={handleManageBilling}
            disabled={isProcessing === 'portal'}
          >
            {isProcessing === 'portal' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage Subscription
          </Button>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isDowngrade = PLANS.findIndex(p => p.key === currentPlan) > PLANS.findIndex(p => p.key === plan.key);

          return (
            <Card key={plan.name} className={`bg-surface-900/50 border-surface-800 relative overflow-hidden ${isCurrent ? 'border-brand-500 shadow-lg shadow-brand-500/10' : ''}`}>
              {isCurrent && (
                <div className="absolute top-0 inset-x-0 h-1 bg-brand-500" />
              )}
              <CardHeader className="text-center pt-8">
                {isCurrent && (
                  <div className="absolute top-4 right-4 bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Current
                  </div>
                )}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold tracking-tight text-surface-100">{plan.price}</span>
                  <span className="text-sm font-semibold leading-6 text-surface-400">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6 mt-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-surface-300">
                      <Check className="h-5 w-5 shrink-0 text-brand-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'outline' : 'default'}
                  className="w-full"
                  disabled={isCurrent || isDowngrade || !plan.checkoutPlan || (isProcessing && isProcessing === plan.checkoutPlan)}
                  onClick={() => plan.checkoutPlan && handleUpgrade(plan.checkoutPlan)}
                >
                  {isProcessing && isProcessing === plan.checkoutPlan ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isCurrent ? 'Active Plan' : isDowngrade ? 'Downgrade via Portal' : plan.checkoutPlan ? 'Upgrade' : 'Current'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="bg-surface-900/50 border-surface-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-surface-400" /> Payment Method</CardTitle>
            <CardDescription>Manage your payment method through Stripe.</CardDescription>
          </CardHeader>
          <CardContent>
            {currentPlan === 'free' ? (
              <p className="text-sm text-surface-400">No payment method on file. Upgrade to add one.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-surface-300">
                  Your payment method is managed securely by Stripe. Click below to update it.
                </p>
                <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={isProcessing === 'portal'}>
                  {isProcessing === 'portal' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Update Payment Method
                </Button>
              </div>
            )}
            <p className="text-xs text-surface-500 flex items-center gap-1 mt-4">
              <AlertCircle className="h-3 w-3" /> Securely processed via Stripe
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-900/50 border-surface-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-surface-400" /> Billing History</CardTitle>
            <CardDescription>View invoices through the Stripe portal.</CardDescription>
          </CardHeader>
          <CardContent>
            {currentPlan === 'free' ? (
              <p className="text-sm text-surface-400">No billing history yet. Invoices will appear here after you subscribe.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-surface-300">
                  Access your complete invoice history and download receipts from the Stripe billing portal.
                </p>
                <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={isProcessing === 'portal'}>
                  {isProcessing === 'portal' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
                  View Invoices
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
