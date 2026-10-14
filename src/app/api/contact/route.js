import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/db';
import Contact from '@/models/Contact';

// POST — Public: submit a contact form
export async function POST(req) {
  try {
    // Rate limit: 5 per hour per IP. Contact-form spam.
    const limited = await enforceRateLimit(req, { bucket: 'contact', limit: 5, windowSeconds: 3600 });
    if (limited) return limited;

    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await dbConnect();

    const contact = await Contact.create({ name, email, message });

    return NextResponse.json({ success: true, id: contact._id }, { status: 201 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
