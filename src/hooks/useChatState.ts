// hooks/useChatState.ts
// No Supabase auth — Mission Control uses cookie-based auth.
// System user ID is hardwired. Messages to agent channels go through /api/agent-chat.

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

// Hardwired — single user app, no Supabase Auth needed
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

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

  // Combine messages with deduplication
  const allMessages = (() => {
    const messageMap = new Map<string | number, Message>();
    baseMessages.forEach(msg => messageMap.set(msg.id, msg));
    realtimeMessages.forEach(msg => {
      if (!messageMap.has(msg.id)) {
        if (String(msg.id).startsWith('temp-')) {
          const similar = baseMessages.find(
            baseMsg =>
              baseMsg.content === msg.content &&
              baseMsg.sender.id === msg.sender.id &&
              Math.abs(new Date(baseMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 10000
          );
          if (!similar) messageMap.set(msg.id, msg);
        } else {
          messageMap.set(msg.id, msg);
        }
      }
    });
    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  })();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Clear realtime messages on chat switch
  useEffect(() => {
    setRealtimeMessages([]);
  }, [selectedChat?.id]);

  // Clean up realtime messages when base loads
  useEffect(() => {
    if (baseMessages.length > 0 && realtimeMessages.length > 0) {
      const now = Date.now();
      setRealtimeMessages(prev =>
        prev.filter(realtimeMsg => {
          const msgTime = new Date(realtimeMsg.timestamp).getTime();
          if (now - msgTime > 30000) return false;
          return !baseMessages.some(baseMsg => {
            if (baseMsg.id === realtimeMsg.id) return true;
            if (String(realtimeMsg.id).startsWith('temp-')) {
              return (
                baseMsg.content === realtimeMsg.content &&
                baseMsg.sender.id === realtimeMsg.sender.id &&
                Math.abs(new Date(baseMsg.timestamp).getTime() - msgTime) < 10000
              );
            }
            return false;
          });
        })
      );
    }
  }, [baseMessages]);

  // Update profiles from message data
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

  // Realtime incoming message handler
  const handleRealtimeMessage = useCallback(
    (newMsg: any) => {
      if (!isMounted.current || !selectedChat || newMsg.channel_id !== selectedChat.id) return;

      const existsInBase = baseMessages.some(msg => msg.id === newMsg.id);
      const existsInRealtime = realtimeMessages.some(msg => msg.id === newMsg.id);
      if (existsInBase || existsInRealtime) return;

      let senderProfile = userProfiles[newMsg.sender_id];
      if (!senderProfile && selectedChat?.participants) {
        senderProfile = getUserProfileFromParticipants(newMsg.sender_id, selectedChat.participants);
      }
      if (!senderProfile) {
        senderProfile = {
          id: newMsg.sender_id,
          name: newMsg.sender_id === SYSTEM_USER_ID ? 'You' : 'Agent',
          avatar: newMsg.sender_id === SYSTEM_USER_ID ? 'Y' : 'A',
          email: '',
        };
      }

      const transformedMessage = transformRealtimeMessage(newMsg, senderProfile);
      setRealtimeMessages(prev => {
        if (prev.some(msg => msg.id === transformedMessage.id)) return prev;
        return [...prev, transformedMessage];
      });
    },
    [selectedChat?.id, selectedChat?.participants, userProfiles, baseMessages, realtimeMessages]
  );

  useRealtimeInsert({
    supabase,
    table: 'messages',
    filter: selectedChat ? `channel_id=eq.${selectedChat.id}` : undefined,
    enabled: !!selectedChat,
    onInsert: handleRealtimeMessage,
  });

  // Send message — routes to /api/agent-chat for agent channels
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

      // Optimistic message
      const optimisticMessage = createOptimisticMessage(
        SYSTEM_USER_ID,
        messageContent,
        userProfile,
        attachments
      );
      setRealtimeMessages(prev => [...prev, optimisticMessage]);

      try {
        const res = await fetch('/api/agent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_id: selectedChat.id,
            content: messageContent,
          }),
        });

        if (!res.ok) {
          throw new Error(`agent-chat failed: ${res.status}`);
        }

        // Remove optimistic — realtime will deliver the real message
        setRealtimeMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      } catch (err) {
        console.error('[useChatState] send error:', err);
        setRealtimeMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        toast.error('Failed to send message');
      }
    },
    [messageText, selectedChat, getUserProfile]
  );

  const handleSelectChat = useCallback(
    (chat: Conversation) => {
      setSelectedChat(chat);
      setUserProfiles({});
      setRealtimeMessages([]);
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
    authLoading: false,       // no auth needed
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