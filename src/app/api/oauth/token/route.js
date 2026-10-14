import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { withDb } from '@/lib/db';
import OAuthCode from '@/models/OAuthCode';
import ApiKey from '@/models/ApiKey';

function oauthError(error, description, status = 400) {
  return NextResponse.json(
    description ? { error, error_description: description } : { error },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Mark the code as replayed and delete the API key minted from it, if any.
 * Paired with the conditional update after minting, so whichever of the two
 * runs second still ends with the key revoked.
 */
async function revokeTokensFromCode(codeId) {
  const flagged = await withDb(() => OAuthCode.findOneAndUpdate(
    { _id: codeId },
    { $set: { replayed: true } },
    { returnDocument: 'after' }
  ).lean());
  if (flagged?.apiKeyId) {
    await withDb(() => ApiKey.deleteOne({ _id: flagged.apiKeyId }));
  }
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/oauth/token
// Claude calls this to exchange an authorization code for an access token.
// The access token IS an API key — our MCP server already validates Bearer tokens via ApiKey model.
export async function POST(request) {
  let body;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await request.json().catch(() => ({}));
  }

  const { grant_type, code, redirect_uri, code_verifier, client_id } = body || {};

  if (grant_type !== 'authorization_code') {
    return oauthError('unsupported_grant_type');
  }

  // Plain strings only: an object here would become a query operator.
  if (!code || typeof code !== 'string') {
    return oauthError('invalid_request', 'code required');
  }
  // Public clients (token_endpoint_auth_method "none") identify themselves with client_id.
  if (!client_id || typeof client_id !== 'string') {
    return oauthError('invalid_request', 'client_id required');
  }
  if (redirect_uri !== undefined && typeof redirect_uri !== 'string') {
    return oauthError('invalid_request', 'redirect_uri must be a string');
  }
  if (!code_verifier || typeof code_verifier !== 'string') {
    return oauthError('invalid_request', 'code_verifier required');
  }

  try {
  // Find the authorization code
  const authCode = await withDb(() => OAuthCode.findOne({ code }).lean());

  if (!authCode) {
    return oauthError('invalid_grant', 'Invalid or expired code');
  }

  // A second redemption: refuse it and revoke the token issued from this code
  // (RFC 6749 §4.1.2), since the code may have leaked.
  if (authCode.used) {
    await revokeTokensFromCode(authCode._id);
    return oauthError('invalid_grant', 'Code has already been used');
  }

  // Check expiry
  if (authCode.expiresAt < new Date()) {
    return oauthError('invalid_grant', 'Code has expired');
  }

  // The code is bound to the client and redirect URI it was issued for.
  if (client_id !== authCode.clientId) {
    return oauthError('invalid_grant', 'client_id mismatch');
  }
  if (authCode.redirectUri && redirect_uri !== authCode.redirectUri) {
    return oauthError('invalid_grant', 'redirect_uri mismatch');
  }

  // PKCE, S256 only (codes are only issued with an S256 challenge).
  if (!authCode.codeChallenge || authCode.codeChallengeMethod !== 'S256') {
    return oauthError('invalid_grant', 'PKCE with S256 is required');
  }
  const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
  if (!safeEqual(hash, authCode.codeChallenge)) {
    return oauthError('invalid_grant', 'code_verifier mismatch');
  }

  // Redeem the code: flip used false -> true in one atomic update, so of two
  // concurrent requests with the same code only one gets a token.
  const redeemed = await withDb(() => OAuthCode.findOneAndUpdate(
    { _id: authCode._id, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } },
    { returnDocument: 'after' }
  ).lean());
  if (!redeemed) {
    await revokeTokensFromCode(authCode._id);
    return oauthError('invalid_grant', 'Code has already been used');
  }

  // Mint the access token (an API key).
  const minted = await withDb(async () => {
    const { key, prefix, hash: keyHash } = ApiKey.generateKey();
    const doc = await ApiKey.create({
      key: keyHash,
      prefix,
      name: 'Claude Connector (auto)',
      user: authCode.userId,
    });
    return { key, id: doc._id };
  });

  // Record which key this code produced. If a replay was seen in the meantime,
  // the key is revoked straight away instead of being handed out.
  const recorded = await withDb(() => OAuthCode.findOneAndUpdate(
    { _id: authCode._id, replayed: { $ne: true } },
    { $set: { apiKeyId: minted.id } }
  ).lean());
  if (!recorded) {
    await withDb(() => ApiKey.deleteOne({ _id: minted.id }));
    return oauthError('invalid_grant', 'Code has already been used');
  }
  const accessToken = minted.key;

  // Return OAuth token response
  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    // No expiry — key is permanent until revoked
  }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('OAuth token error:', err?.stack || err);
    return oauthError('server_error', 'Token exchange failed — please try again.', 500);
  }
}
