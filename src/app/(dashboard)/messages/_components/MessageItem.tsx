// app/dashboard/[id]/messages/_components/MessageItem.tsx
'use client';

import { MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
}

interface Message {
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
  attachments?: Attachment[];
}

interface MessageItemProps {
  message: Message;
  currentUserId: string | null;
  isDeleting?: boolean;
  onContextMenu: (
    e: React.MouseEvent,
    messageId: string | number,
    messageContent: string,
    senderId: string
  ) => void;
  onTouchStart: (
    messageId: string | number,
    messageContent: string,
    senderId: string,
    element: HTMLElement
  ) => void;
  onTouchEnd: () => void;
}

const chartColors = [
  'bg-[hsl(var(--chart-1))]',
  'bg-[hsl(var(--chart-2))]',
  'bg-[hsl(var(--chart-3))]',
  'bg-[hsl(var(--chart-4))]',
  'bg-[hsl(var(--chart-5))]',
];

function getAvatarColorClass(text: string) {
  const safeText = text || '?';
  const index =
    safeText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    chartColors.length;

  return chartColors[index];
}

function renderInitialsAvatar(text: string) {
  const safeText = text || '?';
  const initial = safeText.charAt(0).toUpperCase();

  return (
    <div
      className={`avatar-initials ${getAvatarColorClass(
        safeText
      )} flex h-full w-full items-center justify-center`}
    >
      <span className="text-xs font-semibold uppercase text-[hsl(var(--primary-foreground))]">
        {initial}
      </span>
    </div>
  );
}

function renderAvatar(avatar: string, name: string) {
  if (avatar?.startsWith('http')) {
    return (
      <img
        src={avatar}
        alt={`${name}'s avatar`}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';

          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
      />
    );
  }

  return renderInitialsAvatar(name || avatar);
}

function formatMessageTime(timestamp: string) {
  try {
    return format(new Date(timestamp), 'h:mm a');
  } catch {
    return '';
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function MessageItem({
  message,
  currentUserId,
  isDeleting = false,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}: MessageItemProps) {
  const isCurrentUser = message.sender.id === currentUserId;

  const handleContextMenu = (e: React.MouseEvent) => {
    onContextMenu(e, message.id, message.content, message.sender.id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onTouchStart(
      message.id,
      message.content,
      message.sender.id,
      e.currentTarget as HTMLElement
    );
  };

  const avatarFallback = renderInitialsAvatar(message.sender.name || message.sender.avatar);

  return (
    <div
      className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      {!isCurrentUser && (
        <div className="mr-2 flex-shrink-0">
          <div className="message-avatar h-8 w-8 overflow-hidden rounded-full shadow-[var(--shadow-xs)] md:h-10 md:w-10">
            {renderAvatar(message.sender.avatar, message.sender.name)}
            {message.sender.avatar?.startsWith('http') && (
              <div style={{ display: 'none' }}>{avatarFallback}</div>
            )}
          </div>
        </div>
      )}

      <div
        className={`message relative group max-w-[85%] ${
          isCurrentUser ? 'order-1' : 'order-2'
        } md:max-w-[70%]`}
      >
        {!isCurrentUser && (
          <div className="mb-1 ml-1 text-xs text-[hsl(var(--muted-foreground))] font-[var(--font-sans)]">
            {message.sender.name}
          </div>
        )}

        <div className="flex flex-col">
          <div
            className={`message-bubble relative cursor-pointer rounded-[var(--radius)] p-2 shadow-[var(--shadow-xs)] transition-all duration-200 md:p-3 ${
              isCurrentUser ? 'rounded-tr-none' : 'rounded-tl-none'
            }`}
            style={{
              backgroundColor: isCurrentUser
                ? 'hsl(var(--sidebar-primary))'
                : 'hsl(var(--muted))',
              color: isCurrentUser
                ? 'hsl(var(--sidebar-primary-foreground))'
                : 'hsl(var(--foreground))',
              boxShadow: 'var(--shadow-md)',
            }}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            <div className="absolute -right-2 -top-2 hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
              <div
                className="rounded-full p-1 shadow-sm"
                style={{ backgroundColor: 'hsl(var(--muted))' }}
              >
                <MoreVertical
                  size={12}
                  className="text-[hsl(var(--muted-foreground))]"
                />
              </div>
            </div>

            {message.content && <p className="break-words text-sm">{message.content}</p>}

            {message.image && (
              <div
                className="message-image mt-2 overflow-hidden rounded-[calc(var(--radius)_-_2px)]"
                style={{ maxHeight: '200px', maxWidth: '300px' }}
              >
                <img
                  src={message.image}
                  alt="Shared"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22100%22%20height=%22100%22%20viewBox=%220%200%20100%20100%22%3E%3Cpath%20fill=%22%23CCC%22%20d=%22M0%200h100v100H0z%22/%3E%3Cpath%20fill=%22%23999%22%20d=%22M40%2040h20v20H40z%22/%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded p-2"
                    style={{
                      backgroundColor: 'hsl(var(--background) / 0.5)',
                      border: '1px solid hsl(var(--border) / 0.5)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div className="flex-shrink-0">
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded"
                          style={{ backgroundColor: 'hsl(var(--muted))' }}
                        >
                          <span className="text-xs">📄</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs font-medium hover:underline"
                      >
                        {attachment.name}
                      </a>
                      <p className="text-xs opacity-70">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ml-1 mt-1 flex items-center">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {formatMessageTime(message.timestamp)}
            </span>

            {message.likes > 0 && (
              <div className="ml-2 flex items-center text-xs text-[hsl(var(--destructive))]">
                <span className="mr-1">❤️</span>
                {message.likes}
              </div>
            )}

            {isDeleting && (
              <div className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                Deleting...
              </div>
            )}
          </div>
        </div>
      </div>

      {isCurrentUser && (
        <div className="ml-2 flex-shrink-0">
          <div className="message-avatar h-8 w-8 overflow-hidden rounded-full shadow-[var(--shadow-xs)] md:h-10 md:w-10">
            {renderAvatar(message.sender.avatar, message.sender.name)}
            {message.sender.avatar?.startsWith('http') && (
              <div style={{ display: 'none' }}>{avatarFallback}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}