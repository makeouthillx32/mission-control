// src/app/(dashboard)/messages/_components/PhotoGallery.tsx
'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './mobile.scss';

interface GalleryMessage {
  id: string | number;
  image?: string | null;
  content?: string;
  timestamp?: string;
}

interface PhotoGalleryProps {
  messages: GalleryMessage[];
}

export default function PhotoGallery({ messages }: PhotoGalleryProps) {
  const [showPhotos, setShowPhotos] = useState(true);

  const imageMessages = useMemo(
    () => messages.filter((msg) => Boolean(msg.image)),
    [messages]
  );

  return (
    <div className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <button
        type="button"
        onClick={() => setShowPhotos((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-[hsl(var(--card-foreground))]">
          Photos ({imageMessages.length})
        </span>
        {showPhotos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {showPhotos && (
        <div className="px-4 pb-4">
          {imageMessages.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No photos shared yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {imageMessages.map((msg) => (
                <a
                  key={String(msg.id)}
                  href={msg.image || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))]"
                >
                  <img
                    src={msg.image || ''}
                    alt={msg.content || 'Shared photo'}
                    className="h-24 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}