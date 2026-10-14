import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { withDb } from '@/lib/db';
import OAuthCode from '@/models/OAuthCode';
import OAuthClient from '@/models/OAuthClient';

// POST /api/oauth/approve
// Called when user clicks "Authorize" on the approval page.
// Issues an authorization code and redirects back to Claude.
export async function POST(request) {
  try {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state') || '';
  const codeChallenge = searchParams.get('code_challenge') || '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'plain';

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri required' }, { status: 400 });
  }

  // Re-validate the redirect_uri against the registered client before issuing a code.
  const validRedirect = await withDb(() => OAuthClient.isValidRedirect(clientId, redirectUri));
  if (!validRedirect) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Unregistered client_id or redirect_uri' },
      { status: 400 }
    );
  }
  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge is required (PKCE)' },
      { status: 400 }
    );
  }
  // S256 only; "plain" (also the default when the method is missing) is refused.
  if (codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge_method must be S256' },
      { status: 400 }
    );
  }

  // Generate + store the authorization code.
  const code = await withDb(async () => {
    const c = OAuthCode.generateCode();
    await OAuthCode.create({
      code: c,
      userId: session.userId,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minute expiry
    });
    return c;
  });

  // Redirect back to Claude with the code
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set('code', code);
  if (state) callbackUrl.searchParams.set('state', state);

  return NextResponse.redirect(callbackUrl.toString(), 303);
  } catch (err) {
    console.error('OAuth approve error:', err?.stack || err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Could not complete authorization — please try again.' },
      { status: 500 }
    );
  }
}
