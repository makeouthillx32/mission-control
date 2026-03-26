"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, RefreshCw, Puzzle, Download, Plus,
  ExternalLink, CheckCircle, Loader2, AlertTriangle, Zap
} from "lucide-react";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import toast from "react-hot-toast";

interface InstalledSkill {
  id: string;
  name: string;
  description: string;
  location: string;
  source: string;
  emoji?: string;
  fileCount: number;
  agents: string[];
}

interface GatewaySkill {
  id: string;
  name?: string;
  skillKey?: string;
  description?: string;
  eligible?: boolean;
  missing?: Record<string, string[]>;
}

interface ClawHubResult {
  slug: string;
  displayName: string;
  summary: string;
  version: string | null;
  updatedAt: number;
  score?: number;
}

type Tab = "installed" | "browse" | "create";

export default function SkillsPage() {
  const [tab, setTab] = useState<Tab>("installed");
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [gatewaySkills, setGatewaySkills] = useState<GatewaySkill[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseResults, setBrowseResults] = useState<ClawHubResult[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [customName, setCustomName] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rpc, isConnected } = useOpenClaw();
  const { agents } = useOpenClawAgents();

  const fetchInstalled = useCallback(async () => {
    setLoadingInstalled(true);
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      setInstalledSkills(data.skills || []);
    } catch {
      setInstalledSkills([]);
    } finally {
      setLoadingInstalled(false);
    }
  }, []);

  const fetchGatewaySkills = useCallback(async () => {
    if (!isConnected) return;
    try {
      const result = await rpc("skills.status" as any);
      setGatewaySkills((result as any)?.skills || []);
    } catch {}
  }, [rpc, isConnected]);

  useEffect(() => {
    fetchInstalled();
  }, [fetchInstalled]);

  useEffect(() => {
    if (isConnected) fetchGatewaySkills();
  }, [isConnected, fetchGatewaySkills]);

  const searchClawHub = useCallback(async (q: string) => {
    if (!q.trim()) { setBrowseResults([]); return; }
    setBrowseLoading(true);
    try {
      const res = await fetch(`/api/skills/search?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setBrowseResults(data.results || []);
    } catch {
      setBrowseResults([]);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchClawHub(browseQuery), 400);
  }, [browseQuery, searchClawHub]);

  useEffect(() => {
    if (tab === "browse" && !browseQuery && browseResults.length === 0) {
      searchClawHub("utility");
    }
  }, [tab]);

  const installSkill = async (slug: string) => {
    setInstallingSlug(slug);
    try {
      const res = await fetch("/api/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, agentId: selectedAgent || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Install failed");
      toast.success(`Installed ${slug}`);
      await fetchInstalled();
      await fetchGatewaySkills();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstallingSlug(null);
    }
  };

  const createCustomSkill = async () => {
    if (!customName.trim()) { toast.error("Name required"); return; }
    setCreatingCustom(true);
    try {
      const res = await fetch("/api/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom: true,
          name: customName.trim(),
          content: customContent.trim() || undefined,
          agentId: selectedAgent || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Create failed");
      toast.success(`Created: ${customName}`);
      setCustomName("");
      setCustomContent("");
      setTab("installed");
      await fetchInstalled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreatingCustom(false);
    }
  };

  const isInstalledOnDisk = (slug: string) =>
    installedSkills.some((s) => s.id === slug || s.name?.toLowerCase() === slug.toLowerCase());

  const isActiveInGateway = (slug: string) =>
    gatewaySkills.some(
      (s) => s.id === slug || s.skillKey === slug || s.name?.toLowerCase() === slug.toLowerCase()
    );

  const agentOptions = agents.map((a: any) => ({
    id: a.id,
    name: a.identity?.name || a.name || a.id,
  }));

  const systemSkillsOnly = gatewaySkills.filter(
    (gs) => !installedSkills.some((s) => s.id === (gs.skillKey || gs.id))
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Skills
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {installedSkills.length} installed · {gatewaySkills.length} in gateway · 13,000+ on ClawHub
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Agent:</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">main (default)</option>
            {agentOptions.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {([
          {
            id: "installed" as Tab,
            label: `Installed${installedSkills.length > 0 ? ` · ${installedSkills.length}` : ""}`,
            icon: <Puzzle className="w-3.5 h-3.5" />,
          },
          {
            id: "browse" as Tab,
            label: "Browse ClawHub",
            icon: <Search className="w-3.5 h-3.5" />,
          },
          {
            id: "create" as Tab,
            label: "Create Custom",
            icon: <Plus className="w-3.5 h-3.5" />,
          },
        ]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "var(--accent-foreground, #fff)" : "var(--text-secondary)",
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Installed tab */}
      {tab === "installed" && (
        <div className="space-y-3">
          {loadingInstalled ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : installedSkills.length === 0 && systemSkillsOnly.length === 0 ? (
            <div
              className="rounded-xl p-12 flex flex-col items-center gap-4 text-center"
              style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)" }}
            >
              <Puzzle className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  No skills installed yet
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Browse ClawHub to find skills or create your own
                </p>
              </div>
              <button
                onClick={() => setTab("browse")}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
              >
                Browse ClawHub
              </button>
            </div>
          ) : (
            <>
              {installedSkills.map((skill) => {
                const active = isActiveInGateway(skill.id);
                return (
                  <div
                    key={skill.id}
                    className="rounded-xl flex items-center gap-3 px-4 py-3"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-xl shrink-0">{skill.emoji || "🧩"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {skill.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor:
                              skill.source === "workspace"
                                ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                                : "var(--border)",
                            color:
                              skill.source === "workspace" ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >
                          {skill.source}
                        </span>
                        {active && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                            style={{ backgroundColor: "#22c55e20", color: "#22c55e" }}
                          >
                            <Zap className="w-3 h-3" />active
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {skill.description}
                      </p>
                    </div>
                    <div className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {skill.agents.length > 0 ? skill.agents.join(", ") : "all agents"} · {skill.fileCount} file{skill.fileCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}

              {systemSkillsOnly.length > 0 && (
                <div className="pt-2">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    System Skills (Gateway)
                  </p>
                  {systemSkillsOnly.map((gs) => (
                    <div
                      key={gs.skillKey || gs.id}
                      className="rounded-xl flex items-center gap-3 px-4 py-3 mb-2"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <span className="text-xl shrink-0">⚙️</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {gs.name || gs.skillKey || gs.id}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
                          >
                            system
                          </span>
                          {gs.eligible === false && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ backgroundColor: "#f9731620", color: "#f97316" }}
                            >
                              <AlertTriangle className="w-3 h-3" />missing deps
                            </span>
                          )}
                        </div>
                        {gs.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                            {gs.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { fetchInstalled(); fetchGatewaySkills(); }}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
            </>
          )}
        </div>
      )}

      {/* Browse ClawHub tab */}
      {tab === "browse" && (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Search 13,000+ skills on ClawHub..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              autoFocus
            />
            {browseLoading && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                style={{ color: "var(--text-muted)" }}
              />
            )}
          </div>

          <div className="space-y-2">
            {!browseLoading && browseQuery && browseResults.length === 0 && (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No results for "{browseQuery}"
              </div>
            )}

            {browseResults.map((result) => {
              const isInstalling = installingSlug === result.slug;
              const installed = isInstalledOnDisk(result.slug);
              const active = isActiveInGateway(result.slug);
              return (
                <div
                  key={result.slug}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {result.displayName}
                        </span>
                        <code
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
                        >
                          {result.slug}
                        </code>
                        {result.version && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            v{result.version}
                          </span>
                        )}
                        {active && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: "#22c55e20", color: "#22c55e" }}
                          >
                            <Zap className="w-3 h-3" />active
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        {result.summary}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Updated {new Date(result.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://clawhub.ai/${result.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => !installed && !isInstalling && installSkill(result.slug)}
                        disabled={isInstalling || installed}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                        style={{
                          backgroundColor: installed ? "#22c55e20" : "var(--accent)",
                          color: installed ? "#22c55e" : "var(--accent-foreground, #fff)",
                        }}
                      >
                        {isInstalling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : installed ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {isInstalling ? "Installing..." : installed ? "Installed" : "Install"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!browseQuery && !browseLoading && (
            <p className="text-center text-xs pt-2" style={{ color: "var(--text-muted)" }}>
              13,000+ skills on{" "}
              <a
                href="https://clawhub.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--accent)" }}
              >
                clawhub.ai
              </a>
              {" "}· Installs into the selected agent's workspace via clawhub CLI
            </p>
          )}
        </div>
      )}

      {/* Create Custom tab */}
      {tab === "create" && (
        <div
          className="rounded-xl p-6 space-y-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Skill Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="my-skill"
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {customName && (
              <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                slug:{" "}
                {customName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              SKILL.md Content{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                (optional — blank template if empty)
              </span>
            </label>
            <textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              rows={14}
              placeholder={`---\nname: My Skill\ndescription: What this skill does\n---\n\n# My Skill\n\nDescribe what this skill does and when the agent should use it.\n\n## Instructions\n\nStep by step guidance for the agent...`}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm font-mono outline-none resize-y transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p
              className="text-xs flex items-center gap-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Saved to selected agent's <code>workspace/skills/</code> folder
            </p>
            <button
              onClick={createCustomSkill}
              disabled={creatingCustom || !customName.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground, #fff)",
              }}
            >
              {creatingCustom ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {creatingCustom ? "Creating..." : "Create Skill"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}