import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
const GATEWAY_URL = (process.env.OPENCLAW_GATEWAY_URL || 'ws://host.docker.internal:18789')
  .replace('ws://', 'http://').replace('wss://', 'https://');
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

async function gatewayRpc(method: string, params?: unknown) {
  const res = await fetch(`${GATEWAY_URL}/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Gateway RPC failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

export async function POST(req: NextRequest) {
  try {
    const { slug, agentId, custom, name, content } = await req.json();

    if (custom) {
      if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

      const agentList: any[] = [];
      try {
        const config = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8'));
        agentList.push(...(config?.agents?.list || []));
      } catch {}

      const targetAgent = agentId
        ? agentList.find((a: any) => a.id === agentId)
        : agentList.find((a: any) => a.id === 'main') || agentList[0];

      if (!targetAgent?.workspace) {
        return NextResponse.json({ error: 'Agent workspace not found' }, { status: 404 });
      }

      const workspace = targetAgent.workspace.replace(/^~/, '/root');
      const skillSlug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const skillDir = path.join(workspace, 'skills', skillSlug);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        content?.trim() || `---\nname: ${name}\ndescription: Custom skill\n---\n\n# ${name}\n\nDescribe what this skill does and when to use it.\n`
      );
      return NextResponse.json({ ok: true, slug: skillSlug, source: 'custom' });
    }

    if (!slug?.trim()) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // Use gateway RPC skills.install — it handles workspace resolution correctly
    await gatewayRpc('skills.install', { id: slug });
    return NextResponse.json({ ok: true, slug, source: 'clawhub' });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}