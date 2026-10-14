import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const organizations = await Organization.find({
      'members.user': session.userId
    }).populate('members.user', 'name email avatar');

    return NextResponse.json({ organizations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 });
    }

    const organization = await Organization.create({
      name,
      slug,
      members: [{ user: session.userId, role: 'owner' }],
      owner: session.userId,
    });

    // Add org to user's organizations array
    await User.findByIdAndUpdate(session.userId, {
      $push: { organizations: organization._id }
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
