// app/api/messages/get-conversations/route.ts
// No Supabase auth — Mission Control uses cookie-based auth.
// Returns all channels with agent_id set — one per OpenClaw agent.

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // All agent channels — agent_id IS NOT NULL is the only criteria
    const { data: channels, error: chanError } = await supabase
      .from('channels')
      .select('id, name, agent_id, created_at')
      .not('agent_id', 'is', null)
      .order('created_at', { ascending: true });

    if (chanError) {
      console.error('[get-conversations] channels query error:', chanError);
      return NextResponse.json({ error: chanError.message }, { status: 500 });
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json([]);
    }

    // Get last message per channel
    const lastMessages: Record<string, any> = {};
    for (const ch of channels) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, created_at, sender_name, sender_type')
        .eq('channel_id', ch.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (msgs && msgs.length > 0) {
        lastMessages[ch.id] = msgs[0];
      }
    }

    const result = channels.map((ch: any) => {
      const last = lastMessages[ch.id];
      return {
        id: ch.id,
        channel_id: ch.id,
        channel_name: ch.name,
        agent_id: ch.agent_id,
        is_group: false,
        last_message_content: last?.content || null,
        last_message_at: last?.created_at || null,
        unread_count: 0,
        participants: [],
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[get-conversations] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}