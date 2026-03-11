// src/app/(dashboard)/messages/_components/ParticipantList.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Participant {
  user_id?: string;
  id?: string;
  display_name?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  email?: string;
  online?: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  avatarColors?: string[];
}

function getAvatarColor(text: string, avatarColors?: string[]) {
  const colors =
    avatarColors && avatarColors.length > 0
      ? avatarColors
      : [
          'bg-[hsl(var(--chart-1))]',
          'bg-[hsl(var(--chart-2))]',
          'bg-[hsl(var(--chart-3))]',
          'bg-[hsl(var(--chart-4))]',
          'bg-[hsl(var(--chart-5))]',
        ];

  const safe = text || '?';
  const index =
    safe.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;

  return colors[index];
}

function renderAvatar(participant: Participant, avatarColors?: string[]) {
  const name = participant.display_name || participant.name || participant.email || 'User';
  const avatar = participant.avatar_url || participant.avatar || '';

  if (avatar && avatar.startsWith('http')) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${getAvatarColor(
        name,
        avatarColors
      )}`}
    >
      <span className="text-xs font-semibold uppercase text-[hsl(var(--primary-foreground))]">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function ParticipantList({
  participants,
  avatarColors,
}: ParticipantListProps) {
  const [showParticipants, setShowParticipants] = useState(true);

  return (
    <div
      className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
    >
      <button
        type="button"
        onClick={() => setShowParticipants((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-[hsl(var(--card-foreground))]">
          Participants ({participants.length})
        </span>
        {showParticipants ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {showParticipants && (
        <div className="space-y-2 px-4 pb-4">
          {participants.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No participants found.
            </p>
          ) : (
            participants.map((participant, index) => {
              const key =
                participant.user_id ||
                participant.id ||
                participant.email ||
                `${participant.display_name || participant.name || 'participant'}-${index}`;

              const name =
                participant.display_name || participant.name || 'Unknown User';

              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2"
                >
                  <div className="relative h-9 w-9 overflow-hidden rounded-full">
                    {renderAvatar(participant, avatarColors)}
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                        participant.online
                          ? 'bg-green-500'
                          : 'bg-[hsl(var(--muted-foreground))]'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[hsl(var(--card-foreground))]">
                      {name}
                    </p>
                    {participant.email && (
                      <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {participant.email}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}