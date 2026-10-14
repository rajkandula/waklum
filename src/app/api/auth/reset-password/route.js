import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PasswordReset from '@/models/PasswordReset';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    // Rate limit: 10 per hour per IP. Brute forcing a reset token.
    const limited = await enforceRateLimit(req, { bucket: 'reset-password', limit: 10, windowSeconds: 3600 });
    if (limited) return limited;

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await dbConnect();

    // Find valid reset token
    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    // Update password
    const user = await User.findById(resetRecord.user);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    return NextResponse.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
