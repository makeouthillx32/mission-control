import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';

function resolveSkillContent(skillId: string, agentWorkspace?: string): string | null {
  const candidates = [
    agentWorkspace && path.join(agentWorkspace.replace('~', '/root'), 'skills', skillId, 'SKILL.md'),
    path.join(OPENCLAW_DIR, 'workspace', 'skills', skillId, 'SKILL.md'),
    path.join(OPENCLAW_DIR, 'workspace-infra', 'skills', skillId, 'SKILL.md'),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { channel_id, content, skill_id, extra_prompt } = await req.json();
    if (!channel_id || !content?.trim()) {
      return NextResponse.json({ error: 'channel_id and content are required' }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data: channel, error: chanError } = await supabase
      .from('channels')
      .select('id, name, agent_id')
      .eq('id', channel_id)
      .single();
    if (chanError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    const agentId = channel.agent_id || 'main';
    const agentName = channel.name || 'Agent';
    let agentWorkspace: string | undefined;
    try {
      const config = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8'));
      agentWorkspace = config?.agents?.list?.find((a: any) => a.id === agentId)?.workspace;
    } catch {}
    let injectedPrompt = extra_prompt || '';
    if (skill_id) {
      const skillContent = resolveSkillContent(skill_id, agentWorkspace);
      if (skillContent) {
        injectedPrompt = `${injectedPrompt}\n\n<active_skill id="${skill_id}">\n${skillContent}\n</active_skill>`.trim();
      }
    }
    const { data: userMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        channel_id,
        sender_type: 'user',
        sender_name: 'You',
        content: content.trim(),
      })
      .select()
      .single();
    if (insertError) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    const gatewayWsUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://host.docker.internal:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    const gatewayHttpUrl = gatewayWsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    if (gatewayToken) {
      (async () => {
        try {
          const sessionKey = `webchat:mission-control:${channel_id}`;
          const body: Record<string, unknown> = {
            model: `openclaw:${agentId}`,
            input: content.trim(),
            stream: false,
          };
          if (injectedPrompt) body.extraSystemPrompt = injectedPrompt;
          const gatewayRes = await fetch(`${gatewayHttpUrl}/v1/responses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${gatewayToken}`,
              'x-openclaw-agent-id': agentId,
              'x-openclaw-session-key': sessionKey,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(300000),
          });
          if (gatewayRes.ok) {
            const data = await gatewayRes.json();
            const reply =
              data?.output_text ||
              data?.output?.find((b: any) => b.type === 'message')?.content?.find((c: any) => c.type === 'output_text')?.text ||
              data?.output?.find((b: any) => b.type === 'message')?.content?.[0]?.text ||
              null;
            if (reply) {
              await supabase.from('messages').insert({ channel_id, sender_type: 'agent', sender_name: agentName, content: reply });
              return;
            }
            console.error('[agent-chat] unparseable /v1/responses:', JSON.stringify(data).slice(0, 400));
          }
          if (!gatewayRes.ok && gatewayRes.status === 404) {
            const fb = await fetch(`${gatewayHttpUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${gatewayToken}`,
                'x-openclaw-agent-id': agentId,
                'x-openclaw-session-key': sessionKey,
              },
              body: JSON.stringify({
                model: `openclaw:${agentId}`,
                messages: [
                  ...(injectedPrompt ? [{ role: 'system', content: injectedPrompt }] : []),
                  { role: 'user', content: content.trim() },
                ],
                max_tokens: 32768,
              }),
              signal: AbortSignal.timeout(300000),
            });
            if (fb.ok) {
              const fbData = await fb.json();
              const fbReply = fbData?.choices?.[0]?.message?.content || null;
              if (fbReply) {
                await supabase.from('messages').insert({ channel_id, sender_type: 'agent', sender_name: agentName, content: fbReply });
                return;
              }
            }
          }
          await supabase.from('messages').insert({ channel_id, sender_type: 'agent', sender_name: agentName, content: 'No response from OpenClaw.' });
        } catch (err) {
          console.error('[agent-chat] fatal:', err);
          await supabase.from('messages').insert({ channel_id, sender_type: 'agent', sender_name: agentName, content: 'No response from OpenClaw.' });
        }
      })();
    }
    return NextResponse.json({ userMessage: userMsg });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}