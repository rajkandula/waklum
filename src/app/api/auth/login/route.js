import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    // Rate limit: 10 per 15 minutes per IP. Password guessing.
    const limited = await enforceRateLimit(req, { bucket: 'login', limit: 10, windowSeconds: 900 });
    if (limited) return limited;

    await dbConnect();
    const { emailOrUsername, password } = await req.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Accounts created through the retired Google sign-in have no password yet.
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Set a password to sign in \u2014 use "Forgot password?" to get a reset link.' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        organizations: user.organizations
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
