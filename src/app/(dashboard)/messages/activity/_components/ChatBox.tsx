"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/app/provider";

type AuthLike = {
  user?: { id?: string } | null;
  session?: { user?: { id?: string } | null } | null;
};

export default function ChatBox({ channelId }: { channelId: string }) {
  const { messages, sendMessage } = useChat(channelId);
  const [content, setContent] = useState("");

  const auth = useAuth() as AuthLike;
  const currentUserId = auth.user?.id ?? auth.session?.user?.id ?? null;

  const handleSend = () => {
    if (content.trim()) {
      sendMessage(content);
      setContent("");
    }
  };

  return (
    <div className="flex h-full flex-col rounded bg-card p-4 shadow">
      <div className="mb-2 flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 ${
              msg.sender_id === currentUserId ? "text-right" : "text-left"
            }`}
          >
            <div className="inline-block rounded-lg bg-secondary p-2">
              <span>{msg.content}</span>
              <div className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
        />
        <button
          className="rounded bg-primary px-4 py-1 text-primary-foreground"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}