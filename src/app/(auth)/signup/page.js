"use client"

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, AuthError, Field } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState(inviteEmail || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);

  const { signup } = useAuth();

  useEffect(() => {
    if (inviteToken) {
      fetch(`/api/invites/accept?token=${inviteToken}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setInviteDetails(data);
            if (data.email && !email) setEmail(data.email);
          }
        })
        .catch(() => {});
    }
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    const result = await signup(name, email, username, password, inviteToken);
    if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
  };

  // Live, non-blocking guidance so the rules are visible before submitting.
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AuthShell
      title={inviteDetails ? 'Join your team' : 'Create your account'}
      description={
        inviteDetails
          ? `You've been invited to ${inviteDetails.orgName}.`
          : 'Start managing projects in a couple of minutes.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500 cursor-pointer transition-colors duration-200">
            Sign in
          </Link>
        </>
      }
    >
      {inviteDetails?.projectName && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/10 p-3">
          <FolderOpen className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-surface-300">
            You&apos;ll be added to <strong className="font-medium text-surface-100">{inviteDetails.projectName}</strong>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthError>{error}</AuthError>

        <Field label="Full name" htmlFor="signup-name">
          <Input
            id="signup-name" name="name" type="text" autoComplete="name"
            placeholder="Ada Lovelace"
            value={name} onChange={(e) => setName(e.target.value)} required
          />
        </Field>

        <Field label="Email" htmlFor="signup-email">
          <Input
            id="signup-email" name="email" type="email" autoComplete="email"
            placeholder="name@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
        </Field>

        <Field label="Username" htmlFor="signup-username">
          <Input
            id="signup-username" name="username" type="text" autoComplete="username"
            placeholder="adalovelace"
            value={username} onChange={(e) => setUsername(e.target.value)} required
          />
        </Field>

        <Field label="Password" htmlFor="signup-password">
          <PasswordInput
            id="signup-password" name="new-password" autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-describedby="signup-password-hint"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          <p
            id="signup-password-hint"
            className={`text-xs transition-colors duration-200 ${tooShort ? 'text-amber-400' : 'text-surface-500'}`}
          >
            {tooShort ? `${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} needed` : 'Use at least 8 characters.'}
          </p>
        </Field>

        <Field label="Confirm password" htmlFor="signup-confirm">
          <PasswordInput
            id="signup-confirm" name="confirm-password" autoComplete="new-password"
            placeholder="Re-enter your password"
            aria-invalid={mismatch || undefined}
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
          />
          {mismatch && <p className="text-xs text-amber-400">Passwords don&apos;t match yet.</p>}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          {isLoading ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-brand-500" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
