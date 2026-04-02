import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

export async function POST(req: NextRequest) {
  try {
    const { custom, name, content, agentId } = await req.json();

    if (!custom) {
      return NextResponse.json({ error: 'Use gateway RPC skills.install for ClawHub installs' }, { status: 400 });
    }

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
      content?.trim() ||
        `---\nname: ${name}\ndescription: Custom skill\n---\n\n# ${name}\n\nDescribe what this skill does and when to use it.\n`
    );

    return NextResponse.json({ ok: true, slug: skillSlug, source: 'custom' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}