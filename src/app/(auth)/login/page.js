"use client"

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, AuthError, Field } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const searchParams = useSearchParams();
  // Only same-site paths ('/x', not '//host' or '/\\host') are followed after sign-in.
  const requested = searchParams.get('redirect');
  const redirectUrl = requested && /^\/(?![\/\\])/.test(requested) ? requested : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(emailOrUsername, password, redirectUrl);
    if (!result.success) {
      setError(result.error);
    } else if (redirectUrl) {
      // OAuth flow — hand control back to the authorization page.
      window.location.href = redirectUrl;
      return;
    }

    setIsLoading(false);
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-500 cursor-pointer transition-colors duration-200">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthError>{error}</AuthError>

        <Field label="Email or username" htmlFor="login-identifier">
          <Input
            id="login-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="name@example.com"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="login-password"
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-500 cursor-pointer transition-colors duration-200"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          {isLoading ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-brand-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
