"use client"

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle, XCircle, Users, FolderOpen } from 'lucide-react';

export default function InvitePage({ params }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, preview, accepting, success, error, expired
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const res = await fetch(`/api/invites/accept?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Invalid invite');
        }
        return;
      }

      setInvite(data);
      setStatus('preview');
    } catch {
      setStatus('error');
      setErrorMsg('Failed to load invite');
    }
  };

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (data.needsSignup) {
        // Redirect to signup with invite context
        router.push(`/signup?invite=${token}&email=${encodeURIComponent(data.invite.email)}`);
        return;
      }

      if (data.needsLogin) {
        // The invited account exists: sign in as it, then come back here to accept.
        router.push(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error);
        return;
      }

      setResult(data);
      setStatus('success');

      // Redirect to the project if one was joined, otherwise dashboard
      const redirectTo = data.projectId 
        ? `/dashboard/projects/${data.projectId}` 
        : '/dashboard';
      setTimeout(() => router.push(redirectTo), 2500);
    } catch {
      setStatus('error');
      setErrorMsg('Failed to accept invite');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <CardContent className="py-16">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
              <p className="text-surface-400">Loading invite...</p>
            </CardContent>
          </>
        )}

        {status === 'preview' && invite && (
          <>
            <CardHeader>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                {invite.projectName ? (
                  <FolderOpen className="h-8 w-8 text-brand-500" />
                ) : (
                  <Users className="h-8 w-8 text-brand-500" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {invite.projectName ? "You're invited to a project!" : "You're invited!"}
              </CardTitle>
              <CardDescription className="mt-2">
                <strong className="text-surface-100">{invite.inviterName}</strong> invited you to join{' '}
                {invite.projectName ? (
                  <>
                    <strong className="text-surface-100">{invite.projectName}</strong>
                    <span className="text-surface-500"> in {invite.orgName}</span>
                  </>
                ) : (
                  <strong className="text-surface-100">{invite.orgName}</strong>
                )}
                {' '}as a{' '}
                <span className="text-brand-600 font-medium">{invite.role}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-surface-900 border border-surface-800 p-4 mb-4">
                <p className="text-sm text-surface-400">Joining as</p>
                <p className="text-surface-100 font-medium">{invite.email}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" onClick={handleAccept}>
                Accept & Join {invite.projectName || 'Workspace'}
              </Button>
              <Link href="/login" className="text-sm text-surface-400 hover:text-surface-300">
                Decline
              </Link>
            </CardFooter>
          </>
        )}

        {status === 'accepting' && (
          <CardContent className="py-16">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
            <p className="text-surface-400">Joining workspace...</p>
          </CardContent>
        )}

        {status === 'success' && (
          <CardContent className="py-16">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-surface-100 mb-2">You're in!</h3>
            <p className="text-surface-400">
              {result?.projectName 
                ? `Welcome to "${result.projectName}". Redirecting...` 
                : 'Redirecting to dashboard...'}
            </p>
          </CardContent>
        )}

        {status === 'expired' && (
          <CardContent className="py-16">
            <XCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-surface-100 mb-2">Invite Expired</h3>
            <p className="text-surface-400 mb-6">This invite link has expired. Ask the workspace admin to send a new one.</p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="py-16">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-surface-100 mb-2">Something went wrong</h3>
            <p className="text-surface-400 mb-6">{errorMsg}</p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
