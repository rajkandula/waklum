import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Sessions are signed with JWT_SECRET. A built-in development secret keeps
// `npm run dev` zero-config, but production refuses to run without a real one:
// anyone who knows the fallback could forge a session.
const DEV_ONLY_SECRET = 'development-only-secret-set-JWT_SECRET-in-production';

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret || DEV_ONLY_SECRET);
}

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(signingKey());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    return payload;
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}
