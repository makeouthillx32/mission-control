import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

interface Workspace {
  id: string;
  name: string;
  emoji: string;
  path: string;
  agentName?: string;
}

function getAgentInfo(workspacePath: string): { name: string; emoji: string } | null {
  const identityPath = path.join(workspacePath, 'IDENTITY.md');
  if (!fs.existsSync(identityPath)) return null;
  try {
    const content = fs.readFileSync(identityPath, 'utf-8');
    const nameMatch = content.match(/- \*\*Name:\*\* (.+)/);
    const emojiMatch = content.match(/- \*\*Emoji:\*\* (.+)/);
    let emoji = '🤖';
    if (emojiMatch) {
      emoji = emojiMatch[1].trim().split(' ')[0];
    }
    return {
      name: nameMatch ? nameMatch[1].trim() : '',
      emoji,
    };
  } catch {
    return null;
  }
}

function resolveWorkspacePath(workspacePath: string): string {
  if (!workspacePath) return '';
  if (path.isAbsolute(workspacePath)) return workspacePath;
  if (workspacePath.startsWith('~')) {
    return workspacePath.replace('~', '/root');
  }
  return workspacePath;
}

export async function GET() {
  try {
    const workspaces: Workspace[] = [];
    const seen = new Set<string>();

    // Read openclaw.json for all agents
    const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
    let agentList: Array<{ id: string; name?: string; workspace?: string }> = [];
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      agentList = config?.agents?.list || [];
    } catch {
      // no config
    }

    // Build a map of agentId -> agent for quick lookup
    const agentMap = new Map(agentList.map((a) => [a.id, a]));

    // Main workspace — read identity from disk, no fallback strings
    const mainWorkspace = path.join(OPENCLAW_DIR, 'workspace');
    if (fs.existsSync(mainWorkspace)) {
      seen.add(mainWorkspace);
      const mainAgent = agentMap.get('main');
      const mainInfo = getAgentInfo(mainWorkspace);
      workspaces.push({
        id: 'workspace',
        name: mainInfo?.name || mainAgent?.name || 'main',
        emoji: mainInfo?.emoji || '🤖',
        path: mainWorkspace,
        agentName: mainInfo?.name || mainAgent?.name,
      });
    }

    // All other agents from openclaw.json
    for (const agent of agentList) {
      if (agent.id === 'main') continue;

      const rawPath = agent.workspace;
      if (!rawPath) continue;

      const resolvedPath = resolveWorkspacePath(rawPath);
      if (!resolvedPath) continue;
      if (seen.has(resolvedPath)) continue;
      if (!fs.existsSync(resolvedPath)) continue;
      seen.add(resolvedPath);

      const agentInfo = getAgentInfo(resolvedPath);

      workspaces.push({
        id: agent.id,
        name: agentInfo?.name || agent.name || agent.id,
        emoji: agentInfo?.emoji || '🤖',
        path: resolvedPath,
        agentName: agentInfo?.name || agent.name,
      });
    }

    // Fallback scan: workspace-* folders in OPENCLAW_DIR not already covered
    try {
      const entries = fs.readdirSync(OPENCLAW_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('workspace-')) continue;
        const workspacePath = path.join(OPENCLAW_DIR, entry.name);
        if (seen.has(workspacePath)) continue;
        if (!fs.existsSync(workspacePath)) continue;
        seen.add(workspacePath);

        const agentId = entry.name.replace('workspace-', '');
        const agentInfo = getAgentInfo(workspacePath);
        const agentFromConfig = agentMap.get(agentId);

        workspaces.push({
          id: entry.name,
          name: agentInfo?.name || agentFromConfig?.name || agentId,
          emoji: agentInfo?.emoji || '🤖',
          path: workspacePath,
          agentName: agentInfo?.name || agentFromConfig?.name,
        });
      }
    } catch {
      // ignore scan errors
    }

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return NextResponse.json({ workspaces: [] }, { status: 500 });
  }
}