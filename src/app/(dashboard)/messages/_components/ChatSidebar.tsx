// app/dashboard/[id]/messages/_components/ChatSidebar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import NewChatModal from './NewChatModal';
import ChatSidebarHeader from './ChatSidebarHeader';
import ChatSidebarSearch from './ChatSidebarSearch';
import ConversationList from './ConversationList';
import {
  useChatDebugActions,
  useDebugLogger,
} from '@/hooks/useChatDebugActions';
import { storage, CACHE_KEYS, CACHE_EXPIRY } from '@/lib/cookieUtils';
import './ChatSidebar.scss';

const CHAT_CACHE_KEYS = {
  CONVERSATIONS: 'conversations',
  USER_CONVERSATIONS: (userId: string) => `user_conversations:${userId}`,
  USER_MESSAGES: (userId: string, channelId: string) =>
    `user_messages:${userId}:${channelId}`,
  SELECTED_CHAT: 'selected_chat',
} as const;

export interface Participant {
  user_id: string;
  display_name: string;
  avatar_url: string;
  email: string;
  online: boolean;
}

export interface Conversation {
  id: string;
  channel_id: string;
  channel_name: string;
  is_group: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  participants: Participant[];
}

type CachedUser = {
  id: string;
};

interface ChatSidebarProps {
  selectedChat: Conversation | null;
  onSelectChat: (chat: Conversation) => void;
  onConversationDeleted?: (channelId: string) => void;
  className?: string;
}

export default function ChatSidebar({
  selectedChat,
  onSelectChat,
  onConversationDeleted,
  className = ""
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string>('Initializing...');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const hasFetched = useRef(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { addDebugLog: hookAddDebugLog } = useDebugLogger('ChatSidebar');

  const addDebugLog = (message: string) => {
    console.log(`[ChatSidebar] ${message}`);
    hookAddDebugLog(message);
  };

  const fetchConversations = async (forceRefresh = false) => {
    if (!isMounted.current) {
      console.log('[ChatSidebar] ❌ Component unmounted, aborting fetch');
      return;
    }

    if (!currentUserId) {
      addDebugLog('❌ No user ID, skipping fetch');
      return;
    }

    addDebugLog(`🔄 Starting fetch (force: ${forceRefresh})`);

    if (!hasFetched.current) {
      addDebugLog('🚀 First fetch - bypassing cache checks');
      forceRefresh = true;
    }

    if (
      !forceRefresh &&
      hasLoadedFromCache &&
      hasFetched.current &&
      Date.now() - lastFetchTime.current < 30000
    ) {
      addDebugLog('⏭️ Skipping fetch (recent fetch with cache)');
      return;
    }

    try {
      hasFetched.current = true;
      lastFetchTime.current = Date.now();

      if (!isMounted.current) return;

      if (!hasLoadedFromCache || forceRefresh) {
        setIsLoading(true);
        addDebugLog('🔄 Setting loading state');
      }

      setError(null);
      addDebugLog('🌐 Making API request...');

      const res = await fetch('/api/messages/get-conversations', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!isMounted.current) return;

      addDebugLog(`📡 API response: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        addDebugLog(`❌ API error: ${res.status} - ${errorText.slice(0, 100)}`);

        if (!isMounted.current) return;

        if (hasLoadedFromCache && conversations.length > 0) {
          addDebugLog('📦 Using cache despite API error');
          setCacheInfo(`${cacheInfo} (API failed, using cache)`);
          return;
        }

        throw new Error(`Failed to fetch conversations: ${res.status} - ${errorText}`);
      }

      const raw = await res.json();
      addDebugLog(`📦 Raw data received: ${Array.isArray(raw) ? raw.length : 'not array'} items`);

      if (!isMounted.current) return;

      if (!Array.isArray(raw)) {
        addDebugLog(`❌ Invalid format: ${typeof raw}`);

        if (hasLoadedFromCache && conversations.length > 0) {
          addDebugLog('📦 Using cache despite invalid response');
          return;
        }

        throw new Error('Server returned invalid data format');
      }

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

      addDebugLog(`✅ Mapped ${mapped.length} conversations successfully`);

      setConversations(mapped);
      setError(null);
      setHasLoadedFromCache(true);

      addDebugLog('💾 Caching conversations...');
      storage.set(
        CHAT_CACHE_KEYS.USER_CONVERSATIONS(currentUserId),
        mapped,
        CACHE_EXPIRY.HOUR,
        currentUserId
      );
      storage.set(
        CHAT_CACHE_KEYS.CONVERSATIONS,
        mapped,
        CACHE_EXPIRY.HOUR
      );

      setCacheInfo(`Fresh data: ${mapped.length} items (cached)`);
      addDebugLog(`✅ Fetch completed: ${mapped.length} conversations`);
    } catch (err) {
      addDebugLog(`❌ Fetch error: ${err instanceof Error ? err.message : 'Unknown'}`);

      if (isMounted.current && (!hasLoadedFromCache || conversations.length === 0)) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to load conversations: ${errorMessage}`);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        addDebugLog('✅ Loading state cleared');
      }
    }
  };

  useChatDebugActions({
    currentUserId,
    setConversations,
    setHasLoadedFromCache,
    setCacheInfo,
    setIsLoading,
    hasFetched,
    lastFetchTime,
    addDebugLog,
    debugLog,
    setDebugLog,
    fetchFunction: fetchConversations
  });

  const loadConversationsFromCache = (userId: string) => {
    addDebugLog(`📦 Loading cache for user: ${userId.slice(-4)}`);

    const userConversations = storage.get(
      CHAT_CACHE_KEYS.USER_CONVERSATIONS(userId),
      [],
      userId
    ) as Conversation[];

    if (Array.isArray(userConversations) && userConversations.length > 0) {
      addDebugLog(`✅ Found user cache: ${userConversations.length} conversations`);
      setConversations(userConversations);
      setIsLoading(false);
      setHasLoadedFromCache(true);
      setCacheInfo(`User cache: ${userConversations.length} items`);
      return;
    }

    const genericConversations = storage.get(
      CHAT_CACHE_KEYS.CONVERSATIONS,
      []
    ) as Conversation[];

    if (Array.isArray(genericConversations) && genericConversations.length > 0) {
      addDebugLog(`✅ Found generic cache: ${genericConversations.length} conversations`);
      setConversations(genericConversations);
      setIsLoading(false);
      setHasLoadedFromCache(true);
      setCacheInfo(`Generic cache: ${genericConversations.length} items`);
      return;
    }

    addDebugLog('📦 No cache found, will fetch from server');
    setCacheInfo('No cache found');
  };

  useEffect(() => {
    isMounted.current = true;

    const initializeUser = async () => {
      try {
        addDebugLog('🔍 Starting user initialization...');

        const cachedUser = storage.get(CACHE_KEYS.CURRENT_USER) as CachedUser | null;

        if (cachedUser?.id && isMounted.current) {
          setCurrentUserId(cachedUser.id);
          addDebugLog(`✅ Found cached user: ${cachedUser.id.slice(-4)}`);
          loadConversationsFromCache(cachedUser.id);
          return;
        }

        addDebugLog('🌐 No cached user, fetching from Supabase...');

        const { data, error } = await supabase.auth.getUser();
        if (!isMounted.current) return;

        if (error) {
          addDebugLog(`❌ Auth error: ${error.message}`);
          setError(`Authentication failed: ${error.message}`);
          setIsLoading(false);
          return;
        }

        if (data?.user?.id) {
          setCurrentUserId(data.user.id);
          addDebugLog(`✅ User authenticated: ${data.user.id.slice(-4)}`);

          storage.set(CACHE_KEYS.CURRENT_USER, data.user, CACHE_EXPIRY.HOUR, data.user.id);
          addDebugLog('💾 User cached successfully');

          loadConversationsFromCache(data.user.id);
        } else {
          addDebugLog('❌ No user found in auth response');
          setError('No authenticated user found');
          setIsLoading(false);
        }
      } catch (err) {
        addDebugLog(`❌ Initialization error: ${err instanceof Error ? err.message : 'Unknown'}`);
        if (isMounted.current) {
          setError('Failed to initialize user session');
          setIsLoading(false);
        }
      }
    };

    initializeUser();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentUserId && isMounted.current) {
      addDebugLog('🚀 User ready, triggering fetch');
      const timer = setTimeout(() => {
        if (isMounted.current) {
          fetchConversations(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentUserId]);

  const handleNewConversation = (conversation: Conversation) => {
    if (!currentUserId) {
      addDebugLog('❌ Cannot add conversation: no user ID');
      return;
    }

    addDebugLog(`➕ Adding conversation: ${conversation.channel_name}`);

    setConversations((prev) => {
      const exists = prev.some(c => c.channel_id === conversation.channel_id);
      if (exists) {
        addDebugLog('⚠️ Conversation already exists');
        return prev;
      }

      const updated = [conversation, ...prev];

      storage.set(
        CHAT_CACHE_KEYS.USER_CONVERSATIONS(currentUserId),
        updated,
        CACHE_EXPIRY.HOUR,
        currentUserId
      );
      storage.set(
        CHAT_CACHE_KEYS.CONVERSATIONS,
        updated,
        CACHE_EXPIRY.HOUR
      );

      setHasLoadedFromCache(true);
      setCacheInfo(`Added new: ${updated.length} items`);
      addDebugLog(`✅ Added successfully, total: ${updated.length}`);
      return updated;
    });

    onSelectChat(conversation);
    setTimeout(() => fetchConversations(true), 1000);
  };

  const handleConversationDeleted = (channelId: string) => {
    if (!currentUserId) {
      addDebugLog('❌ Cannot delete conversation: no user ID');
      return;
    }

    addDebugLog(`🗑️ Deleting conversation: ${channelId.slice(-4)}`);

    setConversations((prev) => {
      const updated = prev.filter(conv => conv.channel_id !== channelId);

      storage.set(
        CHAT_CACHE_KEYS.USER_CONVERSATIONS(currentUserId),
        updated,
        CACHE_EXPIRY.HOUR,
        currentUserId
      );
      storage.set(
        CHAT_CACHE_KEYS.CONVERSATIONS,
        updated,
        CACHE_EXPIRY.HOUR
      );

      storage.remove(CHAT_CACHE_KEYS.USER_MESSAGES(currentUserId, channelId));

      setCacheInfo(`Deleted: ${updated.length} items`);
      addDebugLog(`✅ Deleted successfully, remaining: ${updated.length}`);
      return updated;
    });

    onConversationDeleted?.(channelId);
  };

  const handleChatSelect = (chat: Conversation) => {
    if (!currentUserId) {
      addDebugLog('❌ Cannot select chat: no user ID');
      return;
    }

    addDebugLog(`🎯 Chat selected: ${chat.channel_name}`);

    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.channel_id === chat.channel_id
          ? { ...c, unread_count: 0 }
          : c
      );

      storage.set(
        CHAT_CACHE_KEYS.USER_CONVERSATIONS(currentUserId),
        updated,
        CACHE_EXPIRY.HOUR,
        currentUserId
      );
      storage.set(
        CHAT_CACHE_KEYS.CONVERSATIONS,
        updated,
        CACHE_EXPIRY.HOUR
      );

      return updated;
    });

    storage.set(
      CHAT_CACHE_KEYS.SELECTED_CHAT,
      chat,
      CACHE_EXPIRY.HOUR,
      currentUserId
    );

    onSelectChat(chat);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    addDebugLog(`🔍 Search: "${query}"`);
  };

  const handleNewChatClick = () => {
    setIsModalOpen(true);
    addDebugLog('📝 New chat modal opened');
  };

  const filteredConversations = searchQuery
    ? conversations.filter(conv =>
        conv.channel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.participants.some(p =>
          p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : conversations;

  const isActuallyLoading = isLoading && !hasLoadedFromCache;

  return (
    <div className={`h-full flex flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] shadow-[var(--shadow-sm)] ${className}`}>
      <ChatSidebarHeader
        onNewChat={handleNewChatClick}
        title="My Chats"
        showNewChatButton={true}
      />

      <ChatSidebarSearch
        onSearchChange={handleSearchChange}
        placeholder="Search conversations..."
      />

      {error && !hasLoadedFromCache ? (
        <div className="m-2 rounded-[var(--radius)] bg-[hsl(var(--destructive))/0.1] p-4 text-center text-[hsl(var(--destructive))]">
          <p className="mb-3 font-medium">Unable to load conversations</p>
          <p className="mb-3 text-sm">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                hasFetched.current = false;
                addDebugLog('🔄 Retry button clicked');
                fetchConversations(true);
              }}
              className="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
            >
              Retry
            </button>
            <button
              onClick={handleNewChatClick}
              className="rounded-[var(--radius)] bg-[hsl(var(--sidebar-primary))] px-4 py-2 text-sm text-[hsl(var(--sidebar-primary-foreground))] transition-opacity hover:opacity-90"
            >
              New Chat
            </button>
          </div>
        </div>
      ) : (
        <ConversationList
          conversations={filteredConversations}
          isLoading={isActuallyLoading}
          searchQuery={searchQuery}
          selectedChat={selectedChat}
          onSelectChat={handleChatSelect}
        />
      )}

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConversationCreated={handleNewConversation}
      />
    </div>
  );
}