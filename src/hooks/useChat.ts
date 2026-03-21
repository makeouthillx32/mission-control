// hooks/useChat.ts
// Aligned with actual DB schema:
// messages: id, channel_id, sender_id (always null), sender_type ('user'|'agent'), sender_name, content, created_at
// No Supabase auth — single-user app, cookie-based auth with hardwired SYSTEM_USER_ID
// Send goes via /api/agent-chat (fire-and-forget to gateway, reply arrives via Realtime)

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Hardwired — no Supabase auth
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;   // always null in practice, kept for schema accuracy
  sender_type: 'user' | 'agent';
  sender_name: string;
  content: string;
  created_at: string;
}

export function useChat(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) return;

    setLoading(true);
    setError(null);

    supabase
      .from('messages')
      .select('id, channel_id, sender_id, sender_type, sender_name, content, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('[useChat] fetch error:', fetchError);
          setError(fetchError.message);
        } else {
          setMessages((data as Message[]) ?? []);
        }
        setLoading(false);
      });

    // Realtime subscription — INSERT only
    const channel = supabase
      .channel(`useChat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        payload => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Fire-and-forget — gateway processes async, reply arrives via Realtime
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !channelId) return;

    const res = await fetch('/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId, content: content.trim() }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[useChat] send error:', res.status, text);
      throw new Error(`Failed to send: ${res.status}`);
    }
  }, [channelId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    currentUserId: SYSTEM_USER_ID,
  };
}