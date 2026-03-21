"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, rpc } = useOpenClaw();
  const { agents, updateAgent, loading } = useOpenClawAgents();

  const agentId = params.id as string;
  const agent = agents.find((a) => a.id === agentId);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [theme, setTheme] = useState("");
  const [modelId, setModelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.identity?.name || agent.name || "");
      setEmoji(agent.identity?.emoji || "");
      setTheme(agent.identity?.theme || "");
      // Pre-select the agent's current model if available in the type
      setModelId((agent as any).model?.primary || "");
    }
  }, [agent]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rpc("agents.set-identity" as any, {
        agentId,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(emoji ? { emoji } : {}),
        ...(theme.trim() ? { theme: theme.trim() } : {}),
      });
      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-secondary)" }} />
      </div>
    );
  }

  if (!agent && !loading) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => router.push("/agents")}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </button>
        <p style={{ color: "var(--text-secondary)" }}>Agent &quot;{agentId}&quot; not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/agents")}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1px" }}
          >
            {[agent?.identity?.emoji, agent?.identity?.name || agent?.name].filter(Boolean).join(" ") || "Edit Agent"}
          </h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
            id: {agentId}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Identity */}
      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="pb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          Identity
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Agent"
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Emoji
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg border bg-transparent text-sm text-center outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              maxLength={4}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            System Prompt
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={6}
            placeholder="You are a helpful assistant..."
            className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none resize-y transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Stored as SOUL.md in the agent workspace.</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="pb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          Configuration
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Primary Model
          </label>
          <ModelSelector
            value={modelId}
            onChange={setModelId}
            placeholder="— Keep existing model —"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Leave blank to keep the agent&apos;s current model.</p>
        </div>
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
          onClick={handleSave}
          disabled={saving || !isConnected}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {!isConnected && (
        <p className="text-xs text-center" style={{ color: "#ef4444" }}>
          Not connected to OpenClaw gateway — changes cannot be saved.
        </p>
      )}
    </div>
  );
}