"use client"

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthShell, AuthError, Field } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Something went wrong');
      else setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }

    setIsLoading(false);
  };

  const backToLogin = (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-500 cursor-pointer transition-colors duration-200"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthShell title="Check your email" description="If an account matches, a reset link is on its way." footer={backToLogin}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-500/10 text-brand-600">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm leading-relaxed text-surface-400">
            The link expires in one hour. If it doesn&apos;t arrive, check your spam folder or try again.
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setSent(false); setEmailOrUsername(''); }}>
            Try a different account
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email or username and we'll send you a reset link."
      footer={backToLogin}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthError>{error}</AuthError>

        <Field label="Email or username" htmlFor="forgot-identifier">
          <Input
            id="forgot-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="name@example.com"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          {isLoading ? 'Sending' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  );
}
