import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';
import { execSync } from 'child_process';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ channel_id: string }> }
) {
  try {
    const params = await context.params;
    const channelId = params.channel_id;
    if (!channelId) return NextResponse.json({ error: 'Missing channel_id' }, { status: 400 });

    const supabase = createServiceClient();

    const { data: channel, error: chanError } = await supabase
      .from('channels')
      .select('id, name, agent_id')
      .eq('id', channelId)
      .single();

    if (chanError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const agentId = channel.agent_id || 'main';
    const sessionKey = `webchat:mission-control:${channelId}`;

    // 1. Delete all messages from Supabase for this channel
    await supabase.from('messages').delete().eq('channel_id', channelId);

    // 2. Reset the OpenClaw session via CLI
    try {
      execSync(`openclaw sessions reset --key "${sessionKey}"`, {
        timeout: 10000,
        encoding: 'utf-8',
      });
    } catch {
      // Session may not exist yet — not a fatal error
    }

    // 3. Also try deleting the session JSONL file directly as fallback
    try {
      const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
      const fs = await import('fs');
      const path = await import('path');
      const sessionsDir = path.join(OPENCLAW_DIR, 'agents', agentId, 'sessions');
      if (fs.existsSync(sessionsDir)) {
        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
          if (file.includes(channelId) || file.includes(sessionKey.replace(/:/g, '_'))) {
            fs.unlinkSync(path.join(sessionsDir, file));
          }
        }
      }
    } catch {
      // Best effort
    }

    return NextResponse.json({ ok: true, agentId, sessionKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to clear session' },
      { status: 500 }
    );
  }
}