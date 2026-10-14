import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PasswordReset from '@/models/PasswordReset';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req) {
  try {
    // Rate limit: 5 per hour per IP. Reset-mail flooding, which also costs money per send.
    const limited = await enforceRateLimit(req, { bucket: 'forgot-password', limit: 5, windowSeconds: 3600 });
    if (limited) return limited;

    const body = await req.json();
    // Accept either key so the field can be labelled "email or username",
    // matching the login form.
    const identifier = (body.emailOrUsername ?? body.email ?? '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Enter your email or username' }, { status: 400 });
    }

    await dbConnect();

    // Signup stores email and username verbatim and login matches verbatim, so
    // match as typed. The extra lowercased email arm is a convenience for people
    // whose keyboard capitalised the first letter.
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Delete any existing reset tokens for this user
    await PasswordReset.deleteMany({ user: user._id });

    // Create new reset token
    await PasswordReset.create({
      user: user._id,
      token,
      expiresAt,
    });

    // Send email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
      });
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
    }

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
