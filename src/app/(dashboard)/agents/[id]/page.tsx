"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import { ArrowLeft, Save, Loader2, FolderOpen, ChevronDown, Shield } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";

interface WorkspaceOption { id: string; name: string; path: string; emoji: string; agentName?: string; }

const TOOL_PROFILES = [
  { id: '', label: 'Default', description: 'Gateway default — no override' },
  { id: 'minimal', label: 'Minimal', description: 'Read-only status only — safest' },
  { id: 'coding', label: 'Coding', description: 'Filesystem read/write, memory, sessions — enables file tools' },
  { id: 'messaging', label: 'Messaging', description: 'Messaging and session management only' },
  { id: 'full', label: 'Full', description: 'All tools — use with caution' },
];

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, rpc } = useOpenClaw();
  const { agents, loading } = useOpenClawAgents();

  const agentId = params.id as string;
  const agent = agents.find((a) => a.id === agentId);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [theme, setTheme] = useState("");
  const [modelId, setModelId] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [toolsProfile, setToolsProfile] = useState("");
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.identity?.name || agent.name || "");
      setEmoji(agent.identity?.emoji || "");
      setTheme(agent.identity?.theme || "");
      setModelId((agent as any).model?.primary || "");
      setWorkspace((agent as any).workspace || "");
      setToolsProfile((agent as any).tools?.profile || "");
    }
  }, [agent]);

  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const res = await fetch("/api/files/workspaces");
      const data = await res.json();
      const ws: WorkspaceOption[] = (data.workspaces || []).map((w: any) => ({
        id: w.id, name: w.name, path: w.path, emoji: w.emoji, agentName: w.agentName,
      }));
      const currentPath = (agent as any)?.workspace || "";
      if (currentPath && !ws.some((w) => w.path === currentPath)) {
        ws.unshift({ id: "current", name: "Current workspace", path: currentPath, emoji: "📁" });
      }
      setWorkspaceOptions(ws);
    } catch { setWorkspaceOptions([]); }
    finally { setLoadingWorkspaces(false); }
  }, [agent]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await rpc("agents.update" as any, {
        agentId,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(emoji ? { emoji } : {}),
        ...(theme.trim() ? { theme: theme.trim() } : {}),
      });

      const originalWorkspace = (agent as any)?.workspace || "";
      if (workspace.trim() && workspace.trim() !== originalWorkspace) {
        await rpc("agents.update" as any, { agentId, workspace: workspace.trim() });
      }

      const originalProfile = (agent as any)?.tools?.profile || "";
      if (toolsProfile !== originalProfile) {
        const configRes = await (rpc as any)("config.get");
        const baseHash = configRes?.baseHash ?? configRes?.hash ?? "";
        const agentIndex = (configRes?.config ?? configRes?.resolved ?? configRes)
          ?.agents?.list?.findIndex((a: any) => a.id === agentId) ?? -1;

        if (baseHash && agentIndex >= 0) {
          const patch: any = { agents: { list: {} } };
          patch.agents.list[agentIndex] = {
            tools: toolsProfile ? { profile: toolsProfile } : null
          };
          await (rpc as any)("config.patch", {
            raw: JSON.stringify(patch),
            baseHash,
          });
        }
      }

      setSuccess(true);
      setTimeout(() => router.push("/agents"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally { setSaving(false); }
  };

  const selectedOption = workspaceOptions.find((w) => w.path === workspace);

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );

  if (!agent) return (
    <div className="p-8">
      <p style={{ color: "var(--text-muted)" }}>Agent not found.</p>
      <button onClick={() => router.push("/agents")} className="mt-4 text-sm underline" style={{ color: "var(--accent)" }}>Back to agents</button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/agents")} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            {agent.identity?.emoji || "🤖"} Edit Agent
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{agentId}</p>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}>{error}</div>}
      {success && <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}>Saved successfully!</div>}

      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="pb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Identity</div>
        <div className="flex gap-4">
          <div className="shrink-0">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Emoji</label>
            <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
              className="w-16 px-3 py-2 rounded-lg border bg-transparent text-center text-lg outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name"
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Soul Prompt</label>
          <textarea value={theme} onChange={(e) => setTheme(e.target.value)} rows={5} placeholder="You are a helpful assistant..."
            className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none resize-y transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Stored as SOUL.md in the agent workspace.</p>
        </div>
      </div>

      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="pb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Configuration</div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Primary Model</label>
          <ModelSelector value={modelId} onChange={setModelId} placeholder="— Use gateway default —" />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Leave blank to inherit the gateway default model.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Workspace Directory</label>
          <div className="relative">
            <button onClick={() => { if (!workspaceOpen) fetchWorkspaces(); setWorkspaceOpen(o => !o); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left"
              style={{ borderColor: workspaceOpen ? "var(--accent)" : "var(--border)", color: workspace ? "var(--text-primary)" : "var(--text-muted)", backgroundColor: "transparent" }}>
              <span className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="font-mono truncate text-xs">
                  {selectedOption ? `${selectedOption.emoji} ${selectedOption.name} — ${selectedOption.path}` : workspace || "Select a workspace..."}
                </span>
              </span>
              {loadingWorkspaces
                ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--text-muted)" }} />
                : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)", transform: workspaceOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
            </button>
            {workspaceOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                {workspaceOptions.length === 0 && !loadingWorkspaces && <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>No workspaces found</div>}
                {workspaceOptions.map((opt) => {
                  const isSelected = opt.path === workspace;
                  return (
                    <button key={opt.id} onClick={() => { setWorkspace(opt.path); setWorkspaceOpen(false); }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                      style={{ backgroundColor: isSelected ? "var(--accent)20" : "transparent", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--card-elevated, var(--muted))"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <span className="text-lg leading-none mt-0.5">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{opt.name}</span>
                          {isSelected && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--accent)30", color: "var(--accent)" }}>current</span>}
                        </div>
                        <div className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{opt.path}</div>
                      </div>
                    </button>
                  );
                })}
                <div className="px-4 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <input type="text" value={workspace} onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="Or type a custom path..."
                    className="w-full px-2 py-1.5 rounded-lg border bg-transparent text-xs font-mono outline-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            Use <code style={{ color: "var(--accent)" }}>~/.openclaw/workspace-agentname</code> for auto-discovery.
          </p>
        </div>
      </div>

      <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="pb-4 text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          <Shield className="w-3.5 h-3.5" />
          Tools
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Tool Profile</label>
          <div className="space-y-2">
            {TOOL_PROFILES.map((profile) => {
              const isActive = toolsProfile === profile.id;
              return (
                <button key={profile.id} onClick={() => setToolsProfile(profile.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: isActive ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--card-elevated, color-mix(in srgb, var(--card) 50%, var(--border)))",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  }}>
                  <div className="w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center" style={{ border: `2px solid ${isActive ? "var(--accent)" : "var(--border)"}` }}>
                    {isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />}
                  </div>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}>{profile.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{profile.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Set to <strong>Coding</strong> to enable file read/write so the agent can update its own workspace files.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/agents")} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !isConnected}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {!isConnected && <p className="text-xs text-center" style={{ color: "#ef4444" }}>Not connected to OpenClaw gateway — editing unavailable.</p>}
    </div>
  );
}