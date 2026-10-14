import { NextResponse } from 'next/server';

// RFC 9728 — Protected Resource Metadata
// Claude discovers this first to find which authorization server to use
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
  });
}
