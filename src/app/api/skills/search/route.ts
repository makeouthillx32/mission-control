import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const limit = req.nextUrl.searchParams.get('limit') || '20';
  try {
    const res = await fetch(`https://clawhub.ai/api/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: { 'User-Agent': 'mission-control/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}