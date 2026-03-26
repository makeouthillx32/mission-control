'use client';

import { ChevronDown, ChevronRight, Search, Bell, UserPlus, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useChatDebugActions, useDebugLogger } from '@/hooks/useChatDebugActions';

interface ActionsSectionProps {
  isGroup: boolean;
  isCollapsed: boolean;
  channelId?: string;
  onToggle: () => void;
  onConversationDeleted?: (channelId: string) => void;
  onClose: () => void;
}

export default function ActionsSection({
  isGroup,
  isCollapsed,
  channelId,
  onToggle,
  onConversationDeleted,
  onClose
}: ActionsSectionProps) {
  const [isClearing, setIsClearing] = useState(false);

  const { addDebugLog } = useDebugLogger('ActionsSection');
  const { clearCache, forceFetch, cleanup } = useChatDebugActions({
    currentUserId: null,
    setConversations: () => {},
    setHasLoadedFromCache: () => {},
    setCacheInfo: () => {},
    setIsLoading: () => {},
    hasFetched: { current: false },
    lastFetchTime: { current: 0 },
    addDebugLog,
    debugLog: [],
    setDebugLog: () => {},
    fetchFunction: () => Promise.resolve()
  });

  const handleSearchInConversation = () => toast.success('Search functionality coming soon!');
  const handleNotificationSettings = () => toast.success('Notification settings coming soon!');
  const handleAddParticipants = () => toast.success('Add participants functionality coming soon!');

  const handleClearSession = async () => {
    if (!channelId) {
      toast.error('Cannot clear session — missing channel ID');
      return;
    }

    const cleanChannelId = String(channelId).trim();
    if (!cleanChannelId || cleanChannelId === 'undefined' || cleanChannelId === 'null') {
      toast.error('Cannot clear session — invalid channel ID');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanChannelId)) {
      toast.error('Cannot clear session — invalid channel ID format');
      return;
    }

    const confirmed = window.confirm(
      isGroup
        ? 'Leave this group? This cannot be undone.'
        : 'Clear this session? This will delete all messages and reset the agent\'s memory of this conversation.'
    );
    if (!confirmed) return;

    try {
      setIsClearing(true);

      const res = await fetch(`/api/messages/${cleanChannelId}/clear-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `Failed to clear session (${res.status})`;
        try { msg = JSON.parse(errText).error || msg; } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to clear session');

      toast.success(isGroup ? 'Left group' : 'Session cleared');

      try {
        await cleanup();
        await clearCache();
        await forceFetch();
      } catch {}

      onClose();
      onConversationDeleted?.(cleanChannelId);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear session');
    } finally {
      setIsClearing(false);
    }
  };

  const getActionButtonStyle = (isDestructive = false, disabled = false) => ({
    width: '100%',
    padding: '8px 12px',
    textAlign: 'left' as const,
    borderRadius: 'var(--radius)',
    background: 'transparent',
    border: 'none',
    color: isDestructive ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: disabled ? 0.6 : 1,
  });

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>, isDestructive = false, disabled = false) => {
    if (!disabled) e.currentTarget.style.backgroundColor = isDestructive ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--accent))';
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>, disabled = false) => {
    if (!disabled) e.currentTarget.style.backgroundColor = 'transparent';
  };

  return (
    <div style={{ borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', flexShrink: 0 }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--accent) / 0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-expanded={!isCollapsed}
      >
        <span>Actions</span>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </button>

      {!isCollapsed && (
        <div style={{ padding: '0 16px 12px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button onClick={handleSearchInConversation} style={getActionButtonStyle()}
              onMouseEnter={(e) => handleHover(e)} onMouseLeave={(e) => handleLeave(e)}>
              <Search size={14} />
              Search in conversation
            </button>

            <button onClick={handleNotificationSettings} style={getActionButtonStyle()}
              onMouseEnter={(e) => handleHover(e)} onMouseLeave={(e) => handleLeave(e)}>
              <Bell size={14} />
              Notification settings
            </button>

            {isGroup && (
              <button onClick={handleAddParticipants} style={getActionButtonStyle()}
                onMouseEnter={(e) => handleHover(e)} onMouseLeave={(e) => handleLeave(e)}>
                <UserPlus size={14} />
                Add participants
              </button>
            )}

            <button
              onClick={handleClearSession}
              disabled={isClearing}
              style={getActionButtonStyle(true, isClearing)}
              onMouseEnter={(e) => handleHover(e, true, isClearing)}
              onMouseLeave={(e) => handleLeave(e, isClearing)}
            >
              {isClearing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              {isClearing ? 'Clearing...' : isGroup ? 'Leave group' : 'Clear session'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}