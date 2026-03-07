import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { OPENCLAW_WORKSPACE, WORKSPACE_IDENTITY } from '@/lib/paths';

const WORKSPACE_PATH = OPENCLAW_WORKSPACE;
const IDENTITY_PATH = WORKSPACE_IDENTITY;
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(os.homedir(), '.openclaw');

function parseIdentityMd(): { name: string; creature: string; emoji: string } {
  try {
    const content = fs.readFileSync(IDENTITY_PATH, 'utf-8');
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const creatureMatch = content.match(/\*\*Creature:\*\*\s*(.+)/);
    const emojiMatch = content.match(/\*\*Emoji:\*\*\s*(.+)/);
    return {
      name: nameMatch?.[1]?.trim() || 'Unknown',
      creature: creatureMatch?.[1]?.trim() || 'AI Agent',
      emoji: emojiMatch?.[1]?.match(/./u)?.[0] || '🤖',
    };
  } catch {
    return { name: 'OpenClaw Agent', creature: 'AI Agent', emoji: '🤖' };
  }
}

// Read openclaw.json and extract all configured providers + models
function getConfiguredModels(): {
  activeModel: string;
  providers: Record<string, { baseUrl: string; models: { id: string; name: string }[] }>;
} {
  try {
    const openclawConfigPath = path.join(OPENCLAW_DIR, 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf-8'));

    // Active model from agents.defaults
    const activeModel =
      config?.agents?.defaults?.model?.primary ||
      process.env.OPENCLAW_MODEL ||
      'unknown';

    // Providers from models.providers (openclaw.json) merged with agents/main/agent/models.json
    const mainModelPath = path.join(OPENCLAW_DIR, 'agents', 'main', 'agent', 'models.json');
    let allProviders: Record<string, { baseUrl: string; models: { id: string; name: string }[] }> = {};

    // Try agents/main/agent/models.json first (has full provider list)
    try {
      const agentModels = JSON.parse(fs.readFileSync(mainModelPath, 'utf-8'));
      for (const [key, val] of Object.entries(agentModels.providers || {})) {
        const p = val as { baseUrl: string; models: { id: string; name: string }[] };
        allProviders[key] = {
          baseUrl: p.baseUrl,
          models: (p.models || []).map((m) => ({ id: m.id, name: m.name })),
        };
      }
    } catch {}

    // Merge in openclaw.json providers (may have overrides)
    for (const [key, val] of Object.entries(config?.models?.providers || {})) {
      const p = val as { baseUrl: string; models: { id: string; name: string }[] };
      if (!allProviders[key]) {
        allProviders[key] = {
          baseUrl: p.baseUrl,
          models: (p.models || []).map((m) => ({ id: m.id, name: m.name })),
        };
      }
    }

    return { activeModel, providers: allProviders };
  } catch {
    return {
      activeModel: process.env.OPENCLAW_MODEL || 'unknown',
      providers: {},
    };
  }
}

// Ping each provider's baseUrl to check if it's reachable
async function probeProviders(
  providers: Record<string, { baseUrl: string; models: { id: string; name: string }[] }>
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  await Promise.all(
    Object.entries(providers).map(async ([key, p]) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(p.baseUrl.replace('/engines/v1', '/'), {
          signal: controller.signal,
          method: 'GET',
        }).catch(() => null);
        clearTimeout(timeout);
        results[key] = res !== null;
      } catch {
        results[key] = false;
      }
    })
  );
  return results;
}

function getIntegrationStatus() {
  const integrations = [];

  // Telegram
  let telegramEnabled = false;
  let telegramAccounts = 0;
  try {
    const openclawConfig = JSON.parse(
      fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8')
    );
    const telegramConfig = openclawConfig?.channels?.telegram;
    telegramEnabled = !!(telegramConfig?.enabled);
    if (telegramConfig?.accounts) {
      telegramAccounts = Object.keys(telegramConfig.accounts).length;
    }
  } catch {}
  integrations.push({
    id: 'telegram',
    name: 'Telegram',
    status: telegramEnabled ? 'connected' : 'disconnected',
    icon: 'MessageCircle',
    lastActivity: telegramEnabled ? new Date().toISOString() : null,
    detail: telegramEnabled ? `${telegramAccounts} bots configured` : null,
  });

  // Twitter
  let twitterConfigured = false;
  try {
    const toolsContent = fs.readFileSync(path.join(WORKSPACE_PATH, 'TOOLS.md'), 'utf-8');
    twitterConfigured = toolsContent.includes('bird') && toolsContent.includes('auth_token');
  } catch {}
  integrations.push({
    id: 'twitter',
    name: 'Twitter (bird CLI)',
    status: twitterConfigured ? 'configured' : 'not_configured',
    icon: 'Twitter',
    lastActivity: null,
    detail: null,
  });

  // Google
  let googleConfigured = false;
  let googleDetail: string | null = null;
  try {
    const openclawConfig = JSON.parse(
      fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8')
    );
    const gogPlugin = openclawConfig?.plugins?.entries?.['google-gemini-cli-auth'];
    googleConfigured = !!(gogPlugin?.enabled);
    if (googleConfigured) googleDetail = 'google-gemini-cli-auth plugin enabled';
  } catch {}
  if (!googleConfigured) {
    try {
      googleConfigured = fs.existsSync(path.join(os.homedir(), '.config', 'gog'));
    } catch {}
  }
  integrations.push({
    id: 'google',
    name: 'Google (GOG)',
    status: googleConfigured ? 'configured' : 'not_configured',
    icon: 'Mail',
    lastActivity: null,
    detail: googleDetail,
  });

  return integrations;
}

export async function GET() {
  const identity = parseIdentityMd();
  const uptime = process.uptime();
  const nodeVersion = process.version;
  const { activeModel, providers } = getConfiguredModels();
  const providerHealth = await probeProviders(providers);

  // Build model list with online status
  const modelList = Object.entries(providers).flatMap(([providerKey, p]) =>
    p.models.map((m) => ({
      provider: providerKey,
      id: m.id,
      name: m.name,
      fullId: `${providerKey}/${m.id}`,
      baseUrl: p.baseUrl,
      online: providerHealth[providerKey] ?? false,
      active: activeModel === `${providerKey}/${m.id}`,
    }))
  );

  const systemInfo = {
    agent: {
      name: identity.name,
      creature: identity.creature,
      emoji: identity.emoji,
    },
    system: {
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      nodeVersion,
      model: activeModel,
      models: modelList,
      workspacePath: WORKSPACE_PATH,
      platform: os.platform(),
      hostname: os.hostname(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
    },
    integrations: getIntegrationStatus(),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(systemInfo);
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    if (action === 'change_password') {
      const { currentPassword, newPassword } = data;
      let envContent = '';
      try {
        envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
      } catch {
        return NextResponse.json({ error: 'Could not read configuration' }, { status: 500 });
      }
      const currentPassMatch = envContent.match(/AUTH_PASSWORD=(.+)/);
      const storedPassword = currentPassMatch?.[1]?.trim();
      if (storedPassword !== currentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      const newEnvContent = envContent.replace(/AUTH_PASSWORD=.*/, `AUTH_PASSWORD=${newPassword}`);
      fs.writeFileSync(ENV_LOCAL_PATH, newEnvContent);
      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    if (action === 'clear_activity_log') {
      const activitiesPath = path.join(process.cwd(), 'data', 'activities.json');
      fs.writeFileSync(activitiesPath, '[]');
      return NextResponse.json({ success: true, message: 'Activity log cleared' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(seconds)}s`);
  return parts.join(' ');
}