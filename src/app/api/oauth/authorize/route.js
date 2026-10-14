import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { withDb } from '@/lib/db';
import OAuthClient from '@/models/OAuthClient';
import { escapeHtml } from '@/lib/utils';

// GET /api/oauth/authorize
// Claude redirects the user here to log in and approve access.
// If already logged in → show approval page.
// If not logged in → redirect to login first.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  // RFC 7636: a missing method means "plain", which we do not accept.
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'plain';
  const responseType = searchParams.get('response_type');

  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri required' }, { status: 400 });
  }

  // Validate client_id + redirect_uri against a registered OAuth client so an
  // authorization code can never be delivered to an attacker-controlled URI.
  let client;
  try {
    client = await withDb(() => OAuthClient.findForRedirect(clientId, redirectUri));
  } catch (err) {
    console.error('OAuth authorize error:', err?.stack || err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Sign-in service is busy — please try again.' },
      { status: 503 }
    );
  }
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Unregistered client_id or redirect_uri' },
      { status: 400 }
    );
  }

  // Require PKCE for these public clients, with the S256 method only.
  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge is required (PKCE)' },
      { status: 400 }
    );
  }
  if (codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge_method must be S256' },
      { status: 400 }
    );
  }

  // Check if user is logged in
  const session = await getSession();

  if (!session) {
    // Redirect to login, then back here after login
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const currentUrl = request.url;
    return NextResponse.redirect(`${baseUrl}/login?redirect=${encodeURIComponent(currentUrl)}`);
  }

  // User is logged in — render approval page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const approveUrl = new URL(`${baseUrl}/api/oauth/approve`);
  approveUrl.searchParams.set('client_id', clientId || '');
  approveUrl.searchParams.set('redirect_uri', redirectUri);
  approveUrl.searchParams.set('state', state || '');
  approveUrl.searchParams.set('code_challenge', codeChallenge || '');
  approveUrl.searchParams.set('code_challenge_method', codeChallengeMethod);

  // The name comes from the client's own registration, so anyone can pick any
  // name: show it escaped, next to where the approval is sent, with a warning.
  const clientName = String(client.clientName || '').trim().slice(0, 80) || 'An unnamed app';
  let redirectHost = redirectUri;
  try { redirectHost = new URL(redirectUri).host || redirectUri; } catch { /* keep the raw URI */ }

  // Return a simple HTML approval page
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize — Waklum</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #0a0b0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      background: #12131a; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
      padding: 48px; max-width: 440px; width: 100%; text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    }
    .logo {
      width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 20px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .desc { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 28px; }
    .perms {
      text-align: left; background: rgba(255,255,255,0.04); border-radius: 12px;
      padding: 16px 20px; margin-bottom: 28px;
    }
    .perms h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 12px; }
    .perms li { list-style: none; font-size: 13px; color: #d1d5db; padding: 5px 0; display: flex; align-items: center; gap: 8px; }
    .perms li::before { content: '✓'; color: #3b82f6; font-weight: 700; }
    .actions { display: flex; gap: 12px; }
    .btn {
      flex: 1; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s;
    }
    .btn-cancel {
      background: rgba(255,255,255,0.06); color: #9ca3af; border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-approve {
      background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff;
      box-shadow: 0 4px 20px rgba(59,130,246,0.3);
    }
    .btn-approve:hover { box-shadow: 0 6px 28px rgba(59,130,246,0.45); transform: translateY(-1px); }
    .user { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .user strong { color: #d1d5db; }
    .desc strong { color: #fff; word-break: break-word; }
    .warn {
      text-align: left; font-size: 13px; line-height: 1.5; color: #fcd34d;
      background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
      border-radius: 12px; padding: 12px 16px; margin-bottom: 28px;
    }
    .warn code { color: #fde68a; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">✦</div>
    <h1>Connect to Waklum</h1>
    <p class="desc"><strong>${escapeHtml(clientName)}</strong> wants to access your Waklum workspace to manage projects, tasks, and documents on your behalf.</p>
    <p class="user">Signed in as <strong>${escapeHtml(session.email || session.name || 'User')}</strong></p>
    <div class="perms">
      <h3>Permissions requested</h3>
      <ul>
        <li>View and create organizations</li>
        <li>View, create, and edit projects</li>
        <li>View, create, and edit tasks</li>
        <li>View, create, and edit documents</li>
      </ul>
    </div>
    <p class="warn">Only approve apps you recognise and connected yourself. The name above is chosen by the app, and approving gives it the access listed. After you approve, you go back to <code>${escapeHtml(redirectHost)}</code>.</p>
    <div class="actions">
      <button class="btn btn-cancel" onclick="window.close()">Cancel</button>
      <form method="POST" action="${escapeHtml(approveUrl.toString())}" style="flex:1">
        <button type="submit" class="btn btn-approve" style="width:100%">Authorize</button>
      </form>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // A consent page must never be framed (clickjacking the Authorize button).
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
    },
  });
}
