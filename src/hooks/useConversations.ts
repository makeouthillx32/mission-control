// hooks/useConversations.ts
// Aligned with actual DB schema:
// channels: id, name, agent_id (text, e.g. "main"), type_id
// messages: sender_type ('user'|'agent'), sender_name — no sender_id in practice
// channel_participants: no rows for agent channels (0100, 0101) — participants always []
// Unread: bump when sender_type === 'agent' (agent replied to us)

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRealtimeInsert } from '@/hooks/useRealtimeInsert';
import { storage, CACHE_KEYS } from '@/lib/cookieUtils';
import type { Conversation } from '@/app/(dashboard)/messages/_components/ChatSidebar';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface UseConversationsOptions {
  onConversationDeleted?: (channelId: string) => void;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const hasFetched = useRef(false);

  const fetchConversations = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && hasFetched.current && Date.now() - lastFetchTime.current < 30000) return;

    const cachedData = storage.get(CACHE_KEYS.CONVERSATIONS);
    if (!forceRefresh && cachedData && !hasFetched.current) {
      setConversations(cachedData);
      setIsLoading(false);
      return;
    }

    try {
      hasFetched.current = true;
      lastFetchTime.current = Date.now();
      if (!cachedData || forceRefresh) setIsLoading(true);

      const res = await fetch('/api/messages/get-conversations');
      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`${res.status}`);

      const raw = await res.json();

      // /api/messages/get-conversations returns channels where agent_id IS NOT NULL
      // participants is always [] for agent channels — no channel_participants rows exist
      const mapped: Conversation[] = raw.map((c: any) => ({
        id: c.id ?? c.channel_id,           // channel UUID
        channel_id: c.channel_id,           // same UUID
        channel_name: c.channel_name,       // e.g. "Skill — POWER"
        is_group: c.is_group ?? false,
        last_message: c.last_message_content ?? null,
        last_message_at: c.last_message_at ?? null,
        unread_count: c.unread_count ?? 0,
        participants: [],                   // agent channels have no participants rows
      }));

      if (!isMounted.current) return;
      storage.set(CACHE_KEYS.CONVERSATIONS, mapped, 300);
      setConversations(mapped);
      setError(null);
    } catch (err) {
      console.error('[useConversations] fetch error:', err);
      if (!storage.get(CACHE_KEYS.CONVERSATIONS) || forceRefresh) {
        setError('Failed to load conversations');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    return () => { isMounted.current = false; };
  }, [fetchConversations]);

  // Update sidebar when messages arrive via Realtime
  // sender_type is 'agent' or 'user' — sender_id is always null in our data
  useRealtimeInsert({
    supabase,
    table: 'messages',
    enabled: true,
    onInsert: (newMessage: any) => {
      if (!newMessage?.channel_id || !isMounted.current) return;

      setConversations(prev => {
        const idx = prev.findIndex(c => c.channel_id === newMessage.channel_id);
        if (idx === -1) {
          // New channel we don't know about — refetch
          setTimeout(() => fetchConversations(true), 1000);
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.last_message = newMessage.content;
        conv.last_message_at = newMessage.created_at;

        // Bump unread when the agent replies (not when we send)
        if (newMessage.sender_type === 'agent') {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }

        // Move to top of list
        updated.splice(idx, 1);
        updated.unshift(conv);
        storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
        return updated;
      });
    },
  });

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      if (prev.some(c => c.channel_id === conversation.channel_id)) return prev;
      const updated = [conversation, ...prev];
      storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
      return updated;
    });
  }, []);

  const removeConversation = useCallback((channelId: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.channel_id !== channelId);
      storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
      return updated;
    });
    options.onConversationDeleted?.(channelId);
  }, [options]);

  const markAsRead = useCallback((channelId: string) => {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.channel_id === channelId ? { ...c, unread_count: 0 } : c
      );
      storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
      return updated;
    });
  }, []);

  return {
    conversations,
    isLoading,
    error,
    currentUserId: SYSTEM_USER_ID,
    fetchConversations,
    addConversation,
    removeConversation,
    markAsRead,
    refreshConversations: () => fetchConversations(true),
  };
}