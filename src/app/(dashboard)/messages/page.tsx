'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatState } from '@/hooks/useChatState';
import ChatSidebar from './_components/ChatSidebar';
import ChatHeader from './_components/ChatHeader';
import ChatMessages from './_components/ChatMessages';
import MessageInput from './_components/MessageInput';
import ChatRightSidebar from './_components/ChatRightSidebar';
import Breadcrumb from '@/components/Breadcrumbs/dashboard';
import LoadingSVG from '@/app/_components/_events/loading-page';
import { resolveChatDisplayName } from '@/utils/chatPageUtils';
import './_components/mobile.scss';

const avatarColors = {
  AL: 'bg-blue-500',
  JA: 'bg-orange-500',
  JE: 'bg-green-500',
};

export default function ChatPage() {
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    selectedChat,
    currentUserId,
    messageText,
    setMessageText,
    loadingMessages,
    messagesError,
    allMessages,
    handleSelectChat,
    handleBackToConversations,
    handleSendMessage,
    handleMessageDelete,
    handleConversationDeleted,
    refetchMessages,
  } = useChatState();

  // Responsive layout
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (allMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length]);

  const handleInfoClick = useCallback(() => setShowRightSidebar(prev => !prev), []);
  const handleRightSidebarClose = useCallback(() => setShowRightSidebar(false), []);

  const pageTitle = selectedChat
    ? resolveChatDisplayName(selectedChat, currentUserId)
    : 'Messages';

  // Conversation list view
  if (!selectedChat) {
    return (
      <>
        <Breadcrumb pageName="Messages" />
        <div className="chat-container">
          {!isMobile ? (
            <>
              <div className="chat-sidebar">
                <ChatSidebar
                  selectedChat={null}
                  onSelectChat={handleSelectChat}
                  onConversationDeleted={handleConversationDeleted}
                />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <p className="text-lg font-medium mb-1">No chat selected</p>
                  <p className="text-sm">Pick an agent from the sidebar to start talking</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mobile-conversation-list">
              <ChatSidebar
                selectedChat={null}
                onSelectChat={handleSelectChat}
                onConversationDeleted={handleConversationDeleted}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  // Chat view
  return (
    <>
      <Breadcrumb pageName={pageTitle} />
      <div className="chat-container">
        {!isMobile ? (
          <>
            <div className="chat-sidebar">
              <ChatSidebar
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onConversationDeleted={handleConversationDeleted}
              />
            </div>
            <div className="chat-content">
              <ChatHeader
                selectedChat={selectedChat}
                currentUserId={currentUserId}
                onInfoClick={handleInfoClick}
              />
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSVG />
                </div>
              ) : messagesError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading messages</p>
                    <button
                      onClick={refetchMessages}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ChatMessages
                    messages={allMessages}
                    currentUserId={currentUserId}
                    messagesEndRef={messagesEndRef}
                    avatarColors={avatarColors}
                    onMessageDelete={handleMessageDelete}
                  />
                  <MessageInput
                    message={messageText}
                    onSetMessage={setMessageText}
                    handleSendMessage={handleSendMessage}
                  />
                </>
              )}
            </div>
            {showRightSidebar && (
              <div className="chat-right-sidebar">
                <ChatRightSidebar
                  selectedChat={selectedChat}
                  currentUserId={currentUserId}
                  onClose={handleRightSidebarClose}
                  onConversationDeleted={handleConversationDeleted}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mobile-chat-view">
            <ChatHeader
              selectedChat={selectedChat}
              currentUserId={currentUserId}
              onInfoClick={handleInfoClick}
              onBackClick={handleBackToConversations}
              showBackButton={true}
            />
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSVG />
              </div>
            ) : messagesError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-500 mb-2">Error loading messages</p>
                  <button
                    onClick={refetchMessages}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ChatMessages
                  messages={allMessages}
                  currentUserId={currentUserId}
                  messagesEndRef={messagesEndRef}
                  avatarColors={avatarColors}
                  onMessageDelete={handleMessageDelete}
                />
                <MessageInput
                  message={messageText}
                  onSetMessage={setMessageText}
                  handleSendMessage={handleSendMessage}
                />
              </>
            )}
            {showRightSidebar && (
              <div
                className="mobile-right-sidebar-overlay"
                onClick={e => {
                  if (e.target === e.currentTarget) setShowRightSidebar(false);
                }}
              >
                <div className="chat-right-sidebar-content">
                  <ChatRightSidebar
                    selectedChat={selectedChat}
                    currentUserId={currentUserId}
                    onClose={handleRightSidebarClose}
                    onConversationDeleted={handleConversationDeleted}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}