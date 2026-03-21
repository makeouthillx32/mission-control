"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";

export default function NewAgentPage() {
  const router = useRouter();
  const { isConnected, rpc } = useOpenClaw();
  const { createAgent } = useOpenClawAgents();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [theme, setTheme] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [modelId, setModelId] = useState("");
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
      // Step 1: create — gateway only accepts name and workspace
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
      const created = await createAgent({
        name: name.trim(),
        workspace: workspace.trim() || `~/clawd-${slug}`,
      } as any) as any;

      // Step 2: patch identity via agents.update (flat params, agentId not id)
      const agentId = created?.id ?? slug;
      const hasIdentity = (emoji && emoji !== "🤖") || theme.trim();
      if (hasIdentity) {
        await rpc("agents.update" as any, {
          agentId,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(emoji ? { emoji } : {}),
          ...(theme.trim() ? { theme: theme.trim() } : {}),
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
            New Agent
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Add a new agent to your OpenClaw system
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
            rows={5}
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
            placeholder="— Use gateway default —"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Leave blank to inherit the gateway default model.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Workspace Directory
          </label>
          <input
            type="text"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="~/clawd-my-agent  (leave blank for default)"
            className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm font-mono outline-none transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Path on the OpenClaw host where this agent&apos;s files live.</p>
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
          onClick={handleCreate}
          disabled={saving || !isConnected}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Create Agent
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