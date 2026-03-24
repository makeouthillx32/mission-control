"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function NewAgentPage() {
  const router = useRouter();
  const { isConnected, rpc } = useOpenClaw();
  const { createAgent } = useOpenClawAgents();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

      const created = await createAgent({
        name: name.trim(),
        workspace: `~/.openclaw/workspace-${slug}`,
      } as any) as any;

      const agentId = created?.id ?? slug;

      if (emoji && emoji !== "🤖") {
        await rpc("agents.update" as any, {
          agentId,
          name: name.trim(),
          emoji,
        });
      }

      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/agents")}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            New Agent
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Name it and go — edit files in the workspace after.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl p-6 space-y-5"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex gap-4">
          <div className="shrink-0">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Emoji
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={2}
              className="w-16 px-3 py-2 rounded-lg border bg-transparent text-center text-lg outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Agent"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {name.trim() && (
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            workspace: ~/.openclaw/workspace-{name.trim().toLowerCase().replace(/\s+/g, "-")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/agents")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !isConnected || !name.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Creating..." : "Create Agent"}
        </button>
      </div>

      {!isConnected && (
        <p className="text-xs text-center" style={{ color: "#ef4444" }}>
          Not connected to OpenClaw gateway — agent creation unavailable.
        </p>
      )}
    </div>
  );
}