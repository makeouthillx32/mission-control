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
  // Resolve ~ to the home dir (parent of OPENCLAW_DIR on Windows: C:\Users\skill)
  if (workspacePath.startsWith('~')) {
    return workspacePath.replace('~', path.dirname(OPENCLAW_DIR));
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
      // no config, fall through to directory scan
    }

    // Always add main workspace first
    const mainWorkspace = path.join(OPENCLAW_DIR, 'workspace');
    if (fs.existsSync(mainWorkspace)) {
      seen.add(mainWorkspace);
      const mainInfo = getAgentInfo(mainWorkspace);
      workspaces.push({
        id: 'workspace',
        name: 'Workspace Principal',
        emoji: mainInfo?.emoji || '🦞',
        path: mainWorkspace,
        agentName: mainInfo?.name || 'Tenacitas',
      });
    }

    // Add each agent from openclaw.json using their actual workspace path
    for (const agent of agentList) {
      if (agent.id === 'main') continue; // already added above as 'workspace'

      const rawPath = agent.workspace;
      if (!rawPath) continue;

      const resolvedPath = resolveWorkspacePath(rawPath);
      if (!resolvedPath) continue;
      if (seen.has(resolvedPath)) continue;
      if (!fs.existsSync(resolvedPath)) continue;
      seen.add(resolvedPath);

      const agentInfo = getAgentInfo(resolvedPath);
      const label = agent.name || agent.id;

      workspaces.push({
        id: agent.id,
        name: label,
        emoji: agentInfo?.emoji || '🤖',
        path: resolvedPath,
        agentName: agentInfo?.name || label,
      });
    }

    // Fallback: also scan OPENCLAW_DIR for workspace-* folders not already covered
    try {
      const entries = fs.readdirSync(OPENCLAW_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('workspace-')) continue;
        const workspacePath = path.join(OPENCLAW_DIR, entry.name);
        if (seen.has(workspacePath)) continue;
        if (!fs.existsSync(workspacePath)) continue;
        seen.add(workspacePath);
        const agentInfo = getAgentInfo(workspacePath);
        const agentId = entry.name.replace('workspace-', '');
        const label = agentId.charAt(0).toUpperCase() + agentId.slice(1);
        workspaces.push({
          id: entry.name,
          name: label,
          emoji: agentInfo?.emoji || '🤖',
          path: workspacePath,
          agentName: agentInfo?.name || undefined,
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