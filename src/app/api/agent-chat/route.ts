// app/api/agent-chat/route.ts
// Sends a message to the OpenClaw gateway and stores both the user message
// and agent response using sender_type + sender_name — no profile rows needed.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { channel_id, content } = await req.json();

    if (!channel_id || !content?.trim()) {
      return NextResponse.json({ error: 'channel_id and content are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Look up the channel to get agent_id and name
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

    // 2. Store the user's message
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

    // 3. Call OpenClaw gateway
    const gatewayWsUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://host.docker.internal:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    const gatewayHttpUrl = gatewayWsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

    let agentReply: string | null = null;

    if (gatewayToken) {
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
            user: `mission-control-${channel_id}`,
          }),
          signal: AbortSignal.timeout(180000),
        });

        if (gatewayRes.ok) {
          const gatewayData = await gatewayRes.json();
          agentReply = gatewayData?.choices?.[0]?.message?.content || null;
        } else {
          const errText = await gatewayRes.text();
          console.error('[agent-chat] gateway error:', gatewayRes.status, errText);
        }
      } catch (gatewayErr) {
        console.error('[agent-chat] gateway fetch failed:', gatewayErr);
      }
    }

    // 4. Store agent reply
    let agentMsg = null;
    if (agentReply) {
      const { data: agentMsgData, error: agentInsertError } = await supabase
        .from('messages')
        .insert({
          channel_id,
          sender_type: 'agent',
          sender_name: agentName,
          content: agentReply,
        })
        .select()
        .single();

      if (agentInsertError) {
        console.error('[agent-chat] failed to insert agent message:', agentInsertError);
      } else {
        agentMsg = agentMsgData;
      }
    }

    return NextResponse.json({ userMessage: userMsg, agentMessage: agentMsg });
  } catch (err) {
    console.error('[agent-chat] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}