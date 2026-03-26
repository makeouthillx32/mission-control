import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

export async function POST(req: NextRequest) {
  try {
    const { slug, agentId, custom, name, content } = await req.json();

    const agentList: any[] = [];
    try {
      const config = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8'));
      agentList.push(...(config?.agents?.list || []));
    } catch {}

    const targetAgent = agentId
      ? agentList.find((a) => a.id === agentId)
      : agentList[0];

    if (!targetAgent?.workspace) {
      return NextResponse.json({ error: 'Agent workspace not found' }, { status: 404 });
    }

    const workspace = targetAgent.workspace.replace('~', '/root');
    const skillsDir = path.join(workspace, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });

    if (custom) {
      // Create custom skill from provided content
      if (!name?.trim()) return NextResponse.json({ error: 'name required for custom skill' }, { status: 400 });
      const skillSlug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const skillDir = path.join(skillsDir, skillSlug);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content || `---\nname: ${name}\ndescription: Custom skill\n---\n\n# ${name}\n\nDescribe what this skill does.\n`);
      return NextResponse.json({ ok: true, slug: skillSlug, source: 'custom' });
    }

    if (!slug?.trim()) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // Install from ClawHub via CLI
    try {
      execSync(
        `npx clawhub install ${slug} --workdir "${workspace}" --dir "${skillsDir}" --no-input`,
        { timeout: 60000, encoding: 'utf-8', env: { ...process.env, PATH: process.env.PATH } }
      );
    } catch (execErr: any) {
      const msg = execErr.stdout || execErr.stderr || execErr.message || 'Install failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug, source: 'clawhub' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}