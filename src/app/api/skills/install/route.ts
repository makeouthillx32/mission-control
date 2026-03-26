import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

function getAgentWorkspace(agentId?: string): string | null {
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8')
    );
    const list: any[] = config?.agents?.list || [];
    const target = agentId
      ? list.find((a) => a.id === agentId)
      : list.find((a) => a.id === 'main') || list[0];
    return target?.workspace?.replace(/^~/, '/root') || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slug, agentId, custom, name, content } = await req.json();

    const workspace = getAgentWorkspace(agentId);
    if (!workspace) {
      return NextResponse.json({ error: 'Agent workspace not found' }, { status: 404 });
    }

    const skillsDir = path.join(workspace, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });

    if (custom) {
      if (!name?.trim()) {
        return NextResponse.json({ error: 'name required' }, { status: 400 });
      }
      const skillSlug = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const skillDir = path.join(skillsDir, skillSlug);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        content?.trim() ||
          `---\nname: ${name}\ndescription: Custom skill\n---\n\n# ${name}\n\nDescribe what this skill does and when to use it.\n`
      );
      return NextResponse.json({ ok: true, slug: skillSlug, source: 'custom' });
    }

    if (!slug?.trim()) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    try {
      const output = execSync(
        `npx --yes clawhub install ${slug} --workdir "${workspace}" --dir "${skillsDir}" --no-input`,
        {
          timeout: 120000,
          encoding: 'utf-8',
          env: {
            ...process.env,
            PATH: `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ''}`,
          },
        }
      );
      console.log('[skills/install] clawhub output:', output);
    } catch (execErr: any) {
      const msg =
        execErr.stdout?.slice(0, 500) ||
        execErr.stderr?.slice(0, 500) ||
        execErr.message ||
        'Install failed';
      console.error('[skills/install] clawhub error:', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug, source: 'clawhub' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}