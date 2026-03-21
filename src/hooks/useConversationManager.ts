// hooks/useConversationManager.ts
// Aligned with actual DB schema:
// - No userId param (single-user, no Supabase auth)
// - channels.agent_id is text ("main", "docs"), not uuid
// - messages.sender_type is 'user'|'agent', sender_id is always null
// - channel_participants has NO rows for agent channels — participants always []
// - Removed legacy useCacheManager/useConversationFetcher dependencies

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRealtimeInsert } from '@/hooks/useRealtimeInsert';
import { storage, CACHE_KEYS } from '@/lib/cookieUtils';
import type { Conversation } from '@/app/(dashboard)/messages/_components/ChatSidebar';

export type { Conversation };

// Matches channel_participants schema — but will always be empty for agent channels
export interface Participant {
  user_id: string;
  display_name: string;
  avatar_url: string;
  email: string;
  online: boolean;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface UseConversationManagerOptions {
  enableRealtime?: boolean;
  onConversationDeleted?: (channelId: string) => void;
}

export function useConversationManager(options: UseConversationManagerOptions = {}) {
  const { enableRealtime = true, onConversationDeleted } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const hasFetched = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchConversations = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && hasFetched.current && Date.now() - lastFetchTime.current < 30000) return;

    const cached = storage.get(CACHE_KEYS.CONVERSATIONS);
    if (!forceRefresh && cached && !hasFetched.current) {
      setConversations(cached);
      setIsLoading(false);
      return;
    }

    try {
      hasFetched.current = true;
      lastFetchTime.current = Date.now();
      if (!cached || forceRefresh) setIsLoading(true);

      const res = await fetch('/api/messages/get-conversations');
      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`${res.status}`);

      const raw = await res.json();

      // Agent channels (agent_id IS NOT NULL) have no channel_participants rows
      // So participants is always [] — no join needed
      const mapped: Conversation[] = raw.map((c: any) => ({
        id: c.id ?? c.channel_id,
        channel_id: c.channel_id,
        channel_name: c.channel_name,
        is_group: c.is_group ?? false,
        last_message: c.last_message_content ?? null,
        last_message_at: c.last_message_at ?? null,
        unread_count: c.unread_count ?? 0,
        participants: [],
      }));

      if (!isMounted.current) return;
      storage.set(CACHE_KEYS.CONVERSATIONS, mapped, 300);
      setConversations(mapped);
      setError(null);
    } catch (err) {
      console.error('[useConversationManager] fetch error:', err);
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

  // Realtime sidebar updates
  // sender_type is reliable ('user'|'agent'), sender_id is always null
  useRealtimeInsert({
    supabase,
    table: 'messages',
    enabled: enableRealtime,
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

        // Bump unread for incoming agent replies only
        if (newMessage.sender_type === 'agent') {
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
    onConversationDeleted?.(channelId);
  }, [onConversationDeleted]);

  const markAsRead = useCallback((channelId: string) => {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.channel_id === channelId ? { ...c, unread_count: 0 } : c
      );
      storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
      return updated;
    });
  }, []);

  const updateConversation = useCallback((channelId: string, updates: Partial<Conversation>) => {
    setConversations(prev => {
      const updated = prev.map(c => c.channel_id === channelId ? { ...c, ...updates } : c);
      storage.set(CACHE_KEYS.CONVERSATIONS, updated, 300);
      return updated;
    });
  }, []);

  const searchConversations = useCallback((query: string): Conversation[] => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(c => c.channel_name.toLowerCase().includes(q));
  }, [conversations]);

  const getConversation = useCallback((channelId: string): Conversation | null => {
    return conversations.find(c => c.channel_id === channelId) ?? null;
  }, [conversations]);

  return {
    conversations,
    isLoading,
    error,
    currentUserId: SYSTEM_USER_ID,
    addConversation,
    removeConversation,
    markAsRead,
    updateConversation,
    searchConversations,
    getConversation,
    refresh: () => fetchConversations(true),
    reset: () => {
      setConversations([]);
      hasFetched.current = false;
      fetchConversations(true);
    },
  };
}

// Lightweight alias
export function useConversationList(enableRealtime = true) {
  const m = useConversationManager({ enableRealtime });
  return {
    conversations: m.conversations,
    isLoading: m.isLoading,
    error: m.error,
    refresh: m.refresh,
    search: m.searchConversations,
  };
}

export function useConversationActions() {
  const m = useConversationManager();
  return {
    addConversation: m.addConversation,
    removeConversation: m.removeConversation,
    markAsRead: m.markAsRead,
    updateConversation: m.updateConversation,
    getConversation: m.getConversation,
  };
}