'use client';

import { useState, useEffect } from 'react';
import './ChatSidebar.scss';

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

interface ChatSidebarProps {
  selectedChat: Conversation | null;
  onSelectChat: (chat: Conversation) => void;
  onConversationDeleted?: (channelId: string) => void;
  className?: string;
}

export default function ChatSidebar({
  selectedChat,
  onSelectChat,
  className = '',
}: ChatSidebarProps) {
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/messages/get-conversations');
        if (!res.ok) throw new Error(`${res.status}`);
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
        setChannels(mapped);
      } catch (err) {
        console.error('[ChatSidebar] failed to load channels:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = searchQuery
    ? channels.filter(c =>
        c.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channels;

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{
        backgroundColor: 'hsl(var(--sidebar))',
        color: 'hsl(var(--sidebar-foreground))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'hsl(var(--sidebar-border))' }}
      >
        <h2
          className="font-semibold text-sm tracking-wide uppercase"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          Agents
        </h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'hsl(var(--input))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
        />
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div
            className="px-4 py-6 text-center text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Loading agents...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            No agents found
          </div>
        ) : (
          filtered.map(agent => {
            const isSelected = selectedChat?.channel_id === agent.channel_id;
            return (
              <button
                key={agent.channel_id}
                onClick={() => onSelectChat(agent)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? 'hsl(var(--sidebar-accent))'
                    : 'transparent',
                  color: isSelected
                    ? 'hsl(var(--sidebar-accent-foreground))'
                    : 'hsl(var(--sidebar-foreground))',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{
                    backgroundColor: 'hsl(var(--sidebar-primary))',
                    color: 'hsl(var(--sidebar-primary-foreground))',
                  }}
                >
                  {agent.channel_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {agent.channel_name}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                    />
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {agent.last_message || 'OpenClaw Agent'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}