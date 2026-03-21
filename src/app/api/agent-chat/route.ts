// app/api/agent-chat/route.ts
// Fire-and-forget: save user message, kick off gateway call async, return 200 immediately.
// The agent reply arrives via Supabase Realtime — no blocking wait needed.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { channel_id, content } = await req.json();

    if (!channel_id || !content?.trim()) {
      return NextResponse.json({ error: 'channel_id and content are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Look up channel → agent_id + name
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

    // 2. Save user message to Supabase
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
      console.error('[agent-chat] failed to insert user message:', insertError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // 3. Fire gateway call async — DO NOT await. Return 200 immediately.
    // The gateway will call back via Supabase Realtime when the agent responds.
    const gatewayWsUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://host.docker.internal:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    const gatewayHttpUrl = gatewayWsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

    if (gatewayToken) {
      // Fire and forget — intentionally not awaited
      (async () => {
        try {
          const gatewayRes = await fetch(`${gatewayHttpUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${gatewayToken}`,
              'x-openclaw-agent-id': agentId,
            },
            body: JSON.stringify({
              model: `openclaw:${agentId}`,
              messages: [{ role: 'user', content: content.trim() }],
              max_tokens: 32768,
              user: `mission-control-${channel_id}`,
            }),
            signal: AbortSignal.timeout(300000), // 5 min max — but we don't block on it
          });

          if (gatewayRes.ok) {
            const gatewayData = await gatewayRes.json();
            const agentReply = gatewayData?.choices?.[0]?.message?.content || null;

            if (agentReply) {
              // Write agent reply to Supabase — Realtime will push it to the UI
              const { error: agentInsertError } = await supabase
                .from('messages')
                .insert({
                  channel_id,
                  sender_type: 'agent',
                  sender_name: agentName,
                  content: agentReply,
                });

              if (agentInsertError) {
                console.error('[agent-chat] failed to insert agent message:', agentInsertError);
              }
            }
          } else {
            const errText = await gatewayRes.text();
            console.error('[agent-chat] gateway error:', gatewayRes.status, errText);

            // Write a fallback error message so the typing bubble clears
            await supabase.from('messages').insert({
              channel_id,
              sender_type: 'agent',
              sender_name: agentName,
              content: 'No response from OpenClaw.',
            });
          }
        } catch (gatewayErr) {
          console.error('[agent-chat] gateway fetch failed:', gatewayErr);

          // Write fallback so typing bubble clears in UI
          await supabase.from('messages').insert({
            channel_id,
            sender_type: 'agent',
            sender_name: agentName,
            content: 'No response from OpenClaw.',
          });
        }
      })();
    }

    // 4. Return immediately — UI will get the reply via Realtime
    return NextResponse.json({ userMessage: userMsg });
  } catch (err) {
    console.error('[agent-chat] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}