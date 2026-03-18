// app/api/messages/[channel_id]/route.ts
// No Supabase auth — Mission Control uses cookie-based auth.
// Uses sender_type and sender_name columns directly — no profile lookup needed.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// Loose UUID check — accepts any UUID format including version 0
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ channel_id: string }> }
) {
  try {
    const params = await context.params;
    const channel_id = params?.channel_id;

    if (!channel_id || typeof channel_id !== 'string') {
      return NextResponse.json({ error: 'Missing channel_id' }, { status: 400 });
    }

    if (!uuidRegex.test(channel_id)) {
      return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_type, sender_name')
      .eq('channel_id', channel_id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[messages api] query error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages.' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    const messages = data.map((msg: any) => {
      const isUser = msg.sender_type === 'user';
      return {
        id: msg.id,
        content: msg.content || '',
        timestamp: msg.created_at,
        sender: {
          id: isUser ? SYSTEM_USER_ID : `agent-${msg.sender_name || 'agent'}`,
          name: msg.sender_name || (isUser ? 'You' : 'Agent'),
          email: '',
          avatar: msg.sender_name?.charAt(0)?.toUpperCase() || (isUser ? 'Y' : 'A'),
        },
        isEdited: false,
        reactions: [],
        attachments: [],
        likes: 0,
        image: null,
      };
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error('[messages api] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}