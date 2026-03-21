'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'react-hot-toast';
import { useRealtimeInsert } from '@/hooks/useRealtimeInsert';
import { useMessages } from '@/hooks/useMessages';
import {
  createOptimisticMessage,
  transformRealtimeMessage,
  getUserProfileFromParticipants,
  buildUserProfilesCache,
  type Message,
  type UserProfile
} from '@/utils/chatPageUtils';
import type { Conversation } from '@/app/(dashboard)/messages/_components/ChatSidebar';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const AGENT_TYPING_ID = 'agent-typing';

interface UseChatStateOptions {
  onChatSelect?: (chat: Conversation) => void;
  onConversationDeleted?: (channelId: string) => void;
}

export function useChatState(options: UseChatStateOptions = {}) {
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);

  const isMounted = useRef(true);
  const baseMessagesRef = useRef<Message[]>([]);
  const selectedChatRef = useRef<Conversation | null>(null);
  // Stable channel ID ref — only changes when we actually switch channels
  const selectedChatIdRef = useRef<string | null>(null);

  const {
    messages: baseMessages,
    loading: loadingMessages,
    error: messagesError,
    profiles: messageProfiles,
    refetch: refetchMessages,
  } = useMessages({
    channelId: selectedChat?.id || null,
    enabled: !!selectedChat,
  });

  useEffect(() => { baseMessagesRef.current = baseMessages; }, [baseMessages]);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const allMessages = (() => {
    const messageMap = new Map<string | number, Message>();

    baseMessages.forEach(msg => messageMap.set(msg.id, msg));

    realtimeMessages.forEach(msg => {
      if (messageMap.has(msg.id)) return;

      if (String(msg.id).startsWith('temp-')) {
        const inBase = baseMessages.some(
          baseMsg =>
            baseMsg.content === msg.content &&
            baseMsg.sender.id === msg.sender.id &&
            Math.abs(new Date(baseMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 10000
        );
        if (inBase) return;

        const inRealtime = realtimeMessages.some(
          other =>
            !String(other.id).startsWith('temp-') &&
            other.id !== AGENT_TYPING_ID &&
            other.content === msg.content &&
            other.sender.id === msg.sender.id &&
            Math.abs(new Date(other.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 10000
        );
        if (inRealtime) return;
      }

      messageMap.set(msg.id, msg);
    });

    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  })();

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Clear realtime messages only when channel ID actually changes
  useEffect(() => {
    const newId = selectedChat?.id ?? null;
    if (newId !== selectedChatIdRef.current) {
      selectedChatIdRef.current = newId;
      setRealtimeMessages([]);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    if (baseMessages.length > 0) {
      const now = Date.now();
      setRealtimeMessages(prev =>
        prev.filter(msg => {
          if (msg.id === AGENT_TYPING_ID) return true;
          if (String(msg.id).startsWith('temp-')) return true;
          const msgTime = new Date(msg.timestamp).getTime();
          if (now - msgTime > 30000) return false;
          return !baseMessages.some(base => base.id === msg.id);
        })
      );
    }
  }, [baseMessages]);

  useEffect(() => {
    if (messageProfiles && Object.keys(messageProfiles).length > 0) {
      setUserProfiles(prev => ({ ...prev, ...messageProfiles }));
    }
  }, [messageProfiles]);

  useEffect(() => {
    if (selectedChat?.participants) {
      const profilesFromParticipants = buildUserProfilesCache(selectedChat.participants);
      setUserProfiles(prev => ({ ...prev, ...profilesFromParticipants }));
    }
  }, [selectedChat?.participants]);

  const getUserProfile = useCallback(
    (userId: string): UserProfile | null => {
      if (userProfiles[userId]) return userProfiles[userId];
      if (selectedChat?.participants) {
        const profile = getUserProfileFromParticipants(userId, selectedChat.participants);
        if (profile) {
          setUserProfiles(prev => ({ ...prev, [userId]: profile }));
          return profile;
        }
      }
      return null;
    },
    [userProfiles, selectedChat?.participants]
  );

  const handleRealtimeMessage = useCallback((newMsg: any) => {
    if (!isMounted.current) return;
    const chat = selectedChatRef.current;
    if (!chat || newMsg.channel_id !== chat.id) return;

    if (baseMessagesRef.current.some(msg => msg.id === newMsg.id)) return;

    const isUserMessage = newMsg.sender_type === 'user';
    const senderProfile: UserProfile = {
      id: isUserMessage ? SYSTEM_USER_ID : `agent-${newMsg.sender_name || 'agent'}`,
      name: newMsg.sender_name || (isUserMessage ? 'You' : 'Agent'),
      avatar: newMsg.sender_name?.charAt(0)?.toUpperCase() || (isUserMessage ? 'Y' : 'A'),
      email: '',
    };

    const transformedMessage = transformRealtimeMessage(newMsg, senderProfile);

    setRealtimeMessages(prev => {
      if (prev.some(msg => msg.id === transformedMessage.id)) return prev;

      if (isUserMessage) {
        // Replace optimistic user message with real one
        const withoutOptimistic = prev.filter(
          msg =>
            !(String(msg.id).startsWith('temp-') &&
              msg.content === transformedMessage.content &&
              msg.sender.id === transformedMessage.sender.id)
        );
        return [...withoutOptimistic, transformedMessage];
      }

      // Agent message — replace typing bubble if present
      if (prev.some(msg => msg.id === AGENT_TYPING_ID)) {
        return prev.map(msg => msg.id === AGENT_TYPING_ID ? transformedMessage : msg);
      }

      return [...prev, transformedMessage];
    });
  }, []);

  // Use stable channel ID string for filter to avoid unnecessary subscription teardowns
  const realtimeFilter = selectedChatIdRef.current
    ? `channel_id=eq.${selectedChatIdRef.current}`
    : undefined;

  useRealtimeInsert({
    supabase,
    table: 'messages',
    filter: realtimeFilter,
    enabled: !!selectedChatIdRef.current,
    onInsert: handleRealtimeMessage,
  });

  const handleSendMessage = useCallback(
    async (e: React.FormEvent, attachments: any[] = []) => {
      e.preventDefault();

      if ((!messageText.trim() && !attachments.length) || !selectedChat) {
        if (!messageText.trim() && !attachments.length) return;
        toast.error('Cannot send message - please try again');
        return;
      }

      const messageContent = messageText.trim() || '';
      setMessageText('');

      const userProfile = getUserProfile(SYSTEM_USER_ID) || {
        id: SYSTEM_USER_ID,
        name: 'You',
        avatar: 'Y',
        email: '',
      };

      const agentName = selectedChat.channel_name || selectedChat.name || 'Agent';

      const optimisticMessage = createOptimisticMessage(
        SYSTEM_USER_ID,
        messageContent,
        userProfile,
        attachments
      );

      const typingBubble: Message = {
        id: AGENT_TYPING_ID,
        content: '',
        timestamp: new Date().toISOString(),
        likes: 0,
        image: null,
        attachments: [],
        isTyping: true,
        sender: {
          id: `agent-${agentName}`,
          name: agentName,
          avatar: agentName.charAt(0).toUpperCase(),
          email: '',
        },
      };

      setRealtimeMessages(prev => [...prev, optimisticMessage, typingBubble]);

      try {
        const res = await fetch('/api/agent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_id: selectedChat.id,
            content: messageContent,
          }),
        });

        if (!res.ok) throw new Error(`agent-chat failed: ${res.status}`);
        // Don't remove typing bubble here — Realtime will replace it when reply arrives
      } catch (err) {
        console.error('[useChatState] send error:', err);
        // Only clear on actual error — remove both optimistic and typing bubble
        setRealtimeMessages(prev =>
          prev.filter(msg => msg.id !== optimisticMessage.id && msg.id !== AGENT_TYPING_ID)
        );
        toast.error('Failed to send message');
      }
    },
    [messageText, selectedChat, getUserProfile]
  );

  const handleSelectChat = useCallback(
    (chat: Conversation) => {
      setSelectedChat(chat);
      setUserProfiles({});
      options.onChatSelect?.(chat);
    },
    [options]
  );

  const handleBackToConversations = useCallback(() => {
    setSelectedChat(null);
    setUserProfiles({});
    setRealtimeMessages([]);
  }, []);

  const handleMessageDelete = useCallback(
    (messageId: string | number) => {
      setRealtimeMessages(prev => prev.filter(msg => msg.id !== messageId));
      refetchMessages();
    },
    [refetchMessages]
  );

  const handleConversationDeleted = useCallback(
    (channelId: string) => {
      handleBackToConversations();
      options.onConversationDeleted?.(channelId);
    },
    [handleBackToConversations, options]
  );

  return {
    selectedChat,
    currentUserId: SYSTEM_USER_ID,
    messageText,
    setMessageText,
    authLoading: false,
    loadingMessages,
    messagesError,
    allMessages,
    handleSelectChat,
    handleBackToConversations,
    handleSendMessage,
    handleMessageDelete,
    handleConversationDeleted,
    refetchMessages,
    getUserProfile,
  };
}