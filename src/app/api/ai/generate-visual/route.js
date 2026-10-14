import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateSvgDiagram } from '@/lib/generateSvg';

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const svg = await generateSvgDiagram(prompt, context);
    return NextResponse.json({ svg });
  } catch (error) {
    console.error('Visual generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate visual' }, { status: 500 });
  }
}
