'use client';

import React from 'react';

interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
}

interface AttachmentListProps {
  attachments: Attachment[];
}

export default function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const isImage = (attachment: Attachment) => {
    return attachment.type?.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      sizes.length - 1
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${sizes[index]}`;
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id}>
          {isImage(attachment) ? (
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-[calc(var(--radius)_-_2px)]"
            >
              <img
                src={attachment.url}
                alt={attachment.name || 'Attachment'}
                className="block max-h-[220px] w-full max-w-[300px] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          ) : (
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-[calc(var(--radius)_-_2px)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {attachment.name || 'Attachment'}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatFileSize(attachment.size)}
                </div>
              </div>
              <span className="ml-3 shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                Download
              </span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}