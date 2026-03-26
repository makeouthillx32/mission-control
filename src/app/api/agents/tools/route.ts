import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

export async function POST(req: NextRequest) {
  try {
    const { agentId, profile } = await req.json();
    const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (agentId === '__default__') {
      if (!config.agents) config.agents = {};
      if (!config.agents.defaults) config.agents.defaults = {};
      if (profile) {
        config.agents.defaults.tools = { profile };
      } else {
        delete config.agents.defaults.tools;
      }
    } else if (agentId) {
      const list: any[] = config?.agents?.list || [];
      const idx = list.findIndex((a: any) => a.id === agentId);
      if (idx === -1) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      if (profile) {
        list[idx].tools = { profile };
      } else {
        delete list[idx].tools;
      }
      config.agents.list = list;
    } else {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, agentId, profile });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}