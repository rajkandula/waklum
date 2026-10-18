import { NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import OAuthClient from '@/models/OAuthClient';
import { enforceRateLimit } from '@/lib/rateLimit';

// POST /api/oauth/register
// RFC 7591 — Dynamic Client Registration
// Claude calls this to register itself as an OAuth client and receive a client_id.
// Open by design, so it is limited per IP (10 registrations an hour).
export async function POST(request) {
  const limited = await enforceRateLimit(request, { bucket: 'oauth-register', limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { redirect_uris, client_name, grant_types, token_endpoint_auth_method } = body;

  if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris is required and must be a non-empty array' },
      { status: 400 }
    );
  }

  // Shown on the consent page (escaped there): keep it a short plain string.
  const clientName = (typeof client_name === 'string' && client_name.trim().slice(0, 80)) || 'MCP Client';

  try {
    const clientId = await withDb(async () => {
      const id = OAuthClient.generateClientId();
      await OAuthClient.create({
        clientId: id,
        clientName,
        redirectUris: redirect_uris,
        grantTypes: grant_types || ['authorization_code'],
        tokenEndpointAuthMethod: token_endpoint_auth_method || 'none',
      });
      return id;
    });

    // Return the registered client metadata per RFC 7591
    return NextResponse.json({
      client_id: clientId,
      client_name: clientName,
      redirect_uris,
      grant_types: grant_types || ['authorization_code'],
      token_endpoint_auth_method: token_endpoint_auth_method || 'none',
    }, { status: 201 });
  } catch (err) {
    console.error('OAuth register error:', err?.stack || err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Registration failed — please try again.' },
      { status: 500 }
    );
  }
}
