// utils/chatPageUtils.ts (FIXED - Handle empty messages gracefully)
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'react-hot-toast';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Message {
  id: string | number;
  sender: {
    id: string;
    name: string;
    avatar: string;
    email: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  image: string | null;
  attachments?: any[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

// Fetch messages for a channel with better empty state handling
export async function fetchChannelMessages(channelId: string): Promise<Message[]> {
  // Validate channel ID before making API call
  if (!isValidChannelId(channelId)) {
    console.error(`[ChatUtils] ❌ Invalid channel ID format:`, channelId);
    return [];
  }
  
  console.log(`[ChatUtils] Fetching messages for channel: ${channelId}`);
  
  try {
    const res = await fetch(`/api/messages/${channelId}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[ChatUtils] API error: ${res.status} - ${errorText}`);
      if (res.status === 400) return [];
      if (res.status === 403) return [];
      if (res.status === 404) return [];
      if (res.status === 500) return [];
      throw new Error(`Failed to load messages: ${res.status} - ${errorText}`);
    }
    
    const messageData = await res.json();
    if (!messageData) return [];
    if (!Array.isArray(messageData)) return [];
    
    console.log(`[ChatUtils] ✅ Received ${messageData.length} messages from API`);
    
    return messageData.length > 0 
      ? messageData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      : [];
      
  } catch (error) {
    console.error(`[ChatUtils] Error fetching messages for channel ${channelId}:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) return [];
    throw new Error(`Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Send a message — goes through agent-chat API, not direct Supabase insert
export async function sendMessage(
  channelId: string,
  currentUserId: string,
  messageContent: string,
  attachments: any[] = []
): Promise<string> {
  console.log(`[ChatUtils] Sending message to channel ${channelId}`);
  
  try {
    const res = await fetch('/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId, content: messageContent }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to send message: ${res.status} - ${err}`);
    }

    const data = await res.json();
    console.log(`[ChatUtils] ✅ Message sent:`, data?.userMessage?.id);
    return data?.userMessage?.id ?? '';

  } catch (error) {
    console.error('[ChatUtils] Error in sendMessage:', error);
    throw error;
  }
}

// Create optimistic message for UI
export function createOptimisticMessage(
  currentUserId: string,
  messageContent: string,
  userProfile: UserProfile,
  attachments: any[] = []
): Message {
  const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: optimisticId,
    content: messageContent,
    timestamp: new Date().toISOString(),
    likes: 0,
    image: attachments?.find(a => a.type === 'image')?.url || null,
    attachments: attachments || [],
    sender: {
      id: currentUserId,
      name: userProfile.name,
      avatar: userProfile.avatar,
      email: userProfile.email
    }
  };
}

// Transform realtime message
export function transformRealtimeMessage(newMsg: any, senderProfile: UserProfile | null): Message {
  return {
    id: newMsg.id,
    content: newMsg.content || '',
    timestamp: newMsg.created_at || new Date().toISOString(),
    likes: 0,
    image: null,
    sender: {
      id: newMsg.sender_id ?? newMsg.sender_type ?? 'unknown',
      name: senderProfile?.name || newMsg.sender_name || 'Unknown',
      avatar: senderProfile?.avatar || newMsg.sender_name?.charAt(0)?.toUpperCase() || 'U',
      email: senderProfile?.email || '',
    }
  };
}

// Get user profile from participants
export function getUserProfileFromParticipants(
  userId: string,
  participants: any[]
): UserProfile | null {
  if (!Array.isArray(participants)) return null;
  const participant = participants.find(p => p.user_id === userId);
  if (participant) {
    return {
      id: participant.user_id,
      name: participant.display_name || 'User',
      avatar: participant.avatar_url || participant.display_name?.charAt(0)?.toUpperCase() || 'U',
      email: participant.email || ''
    };
  }
  return null;
}

// Build user profiles cache from participants
export function buildUserProfilesCache(participants: any[]): Record<string, UserProfile> {
  const cache: Record<string, UserProfile> = {};
  if (!Array.isArray(participants)) return cache;
  participants.forEach(participant => {
    if (participant?.user_id) {
      cache[participant.user_id] = {
        id: participant.user_id,
        name: participant.display_name || 'User',
        avatar: participant.avatar_url || participant.display_name?.charAt(0)?.toUpperCase() || 'U',
        email: participant.email || ''
      };
    }
  });
  return cache;
}

// Build user profiles cache from messages
export function buildUserProfilesCacheFromMessages(messages: Message[]): Record<string, UserProfile> {
  const cache: Record<string, UserProfile> = {};
  if (!Array.isArray(messages)) return cache;
  messages.forEach(message => {
    if (message?.sender?.id) {
      cache[message.sender.id] = {
        id: message.sender.id,
        name: message.sender.name || 'User',
        avatar: message.sender.avatar || message.sender.name?.charAt(0)?.toUpperCase() || 'U',
        email: message.sender.email || ''
      };
    }
  });
  return cache;
}

// Resolve chat display name
export function resolveChatDisplayName(
  selectedChat: any,
  currentUserId: string | null
): string {
  if (!selectedChat) return 'No Chat Selected';
  if (selectedChat.channel_name?.trim()) return selectedChat.channel_name.trim();
  if (!selectedChat.is_group && Array.isArray(selectedChat.participants)) {
    const otherParticipants = selectedChat.participants
      .filter((p: any) => p.user_id !== currentUserId)
      .map((p: any) => p.display_name || p.email || 'User')
      .filter((name: string) => name?.trim());
    if (otherParticipants.length > 0) return otherParticipants.join(', ');
  }
  return selectedChat.is_group ? 'Unnamed Group' : 'Direct Message';
}

// Initialize Supabase auth — Mission Control is single-user, always returns null
export async function initializeAuth(): Promise<string | null> {
  return null;
}

// Loose UUID check — accepts any UUID including version 0 (seeded channels)
export function isValidChannelId(channelId: any): channelId is string {
  if (typeof channelId !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(channelId);
}

// Extract channel ID from chat object
export function extractChannelId(chatObject: any): string | null {
  if (!chatObject) return null;
  const possibleIds = [chatObject.channel_id, chatObject.id, chatObject.channelId];
  for (const id of possibleIds) {
    if (isValidChannelId(id)) return id;
  }
  console.error('[ChatUtils] ❌ Could not extract valid channel ID from:', chatObject);
  return null;
}