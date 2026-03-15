// hooks/useConversations.ts
// No Supabase auth — Mission Control uses cookie-based auth.
// System user ID is hardwired since this is a single-user app.

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRealtimeInsert } from '@/hooks/useRealtimeInsert';
import { storage, CACHE_KEYS } from '@/lib/cookieUtils';
import type { Conversation } from '@/app/(dashboard)/messages/_components/ChatSidebar';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Hardwired — single user app, no Supabase Auth needed
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

  const fetchConversations = async (forceRefresh = false) => {
    if (!forceRefresh && hasFetched.current && Date.now() - lastFetchTime.current < 30000) {
      return;
    }

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

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch conversations: ${res.status} - ${errorText}`);
      }

      const raw = await res.json();

      const mapped: Conversation[] = raw.map((c: any) => ({
        id: c.id ?? c.channel_id,
        channel_id: c.channel_id,
        channel_name: c.channel_name,
        is_group: c.is_group,
        last_message: c.last_message_content ?? null,
        last_message_at: c.last_message_at ?? null,
        unread_count: c.unread_count ?? 0,
        participants: (c.participants || []).map((p: any) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          email: p.email,
          online: p.online ?? false,
        })),
      }));

      if (!isMounted.current) return;

      storage.set(CACHE_KEYS.CONVERSATIONS, mapped, 300);
      setConversations(mapped);
      setError(null);
    } catch (err) {
      console.error('[useConversations] fetch error:', err);
      if (!cachedData || forceRefresh) {
        setError('Failed to load conversations. Please try again.');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Realtime — update conversation list when new messages arrive
  useRealtimeInsert({
    supabase,
    table: 'messages',
    enabled: true,
    onInsert: (newMessage: any) => {
      if (!newMessage?.channel_id || !isMounted.current) return;

      setConversations(prev => {
        const idx = prev.findIndex(c => c.channel_id === newMessage.channel_id);
        if (idx === -1) {
          setTimeout(() => fetchConversations(true), 1000);
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.last_message = newMessage.content;
        conv.last_message_at = newMessage.created_at;

        if (newMessage.sender_id !== SYSTEM_USER_ID) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }

        updated.splice(idx, 1);
        updated.unshift(conv);
        storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
        return updated;
      });
    },
  });

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      const exists = prev.some(c => c.channel_id === conversation.channel_id);
      if (exists) return prev;
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