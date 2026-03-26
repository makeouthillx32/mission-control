import { NextResponse } from 'next/server';

const GATEWAY_URL = (process.env.OPENCLAW_GATEWAY_URL || 'ws://host.docker.internal:18789')
  .replace('ws://', 'http://').replace('wss://', 'https://');
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ method: 'skills.status', params: null }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return NextResponse.json(data.result || { skills: [] });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}