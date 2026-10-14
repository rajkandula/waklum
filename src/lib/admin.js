import { getSession } from '@/lib/auth';

// Check if user is an admin based on ADMIN_EMAILS env var
export async function verifyAdmin() {
  const session = await getSession();
  if (!session) return null;

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.email?.toLowerCase())) {
    return null;
  }

  return session;
}
