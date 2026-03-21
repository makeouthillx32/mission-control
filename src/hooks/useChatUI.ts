// hooks/useChatUI.ts
// UI state for the messages page.
// Corrected import path: @/app/(dashboard)/messages not @/app/dashboard/[id]/messages
// SYSTEM_USER_ID hardwired — no auth param needed

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveChatDisplayName } from '@/utils/chatPageUtils';
import type { Conversation } from '@/app/(dashboard)/messages/_components/ChatSidebar';
import type { Message } from '@/utils/chatPageUtils';

// Hardwired — single-user, no Supabase auth
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface UseChatUIOptions {
  selectedChat: Conversation | null;
  allMessages: Message[];
}

export function useChatUI({ selectedChat, allMessages }: UseChatUIOptions) {
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Responsive breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (allMessages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [allMessages.length]);

  const handleInfoClick = useCallback(() => {
    setShowRightSidebar(prev => !prev);
  }, []);

  const handleRightSidebarClose = useCallback(() => {
    setShowRightSidebar(false);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setShowRightSidebar(false);
  }, []);

  // resolveChatDisplayName uses currentUserId to determine "You" vs agent name
  const pageTitle = selectedChat
    ? resolveChatDisplayName(selectedChat, SYSTEM_USER_ID)
    : 'Messages';

  return {
    showRightSidebar,
    setShowRightSidebar,
    isMobile,
    messagesEndRef,
    pageTitle,
    handleInfoClick,
    handleRightSidebarClose,
    handleOverlayClick,
  };
}