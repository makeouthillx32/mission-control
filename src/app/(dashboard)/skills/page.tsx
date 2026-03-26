"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, RefreshCw, Puzzle, Download, Plus, X, ChevronDown, ExternalLink, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";
import toast from "react-hot-toast";

interface InstalledSkill {
  id: string; name: string; description: string;
  location: string; source: string; emoji?: string;
  fileCount: number; agents: string[];
}

interface ClawHubResult {
  slug: string; displayName: string; summary: string;
  version: string | null; updatedAt: number; score?: number;
}

type Tab = "installed" | "browse" | "create";

export default function SkillsPage() {
  const [tab, setTab] = useState<Tab>("installed");
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseResults, setBrowseResults] = useState<ClawHubResult[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { agents } = useOpenClawAgents();

  const fetchInstalled = useCallback(async () => {
    setLoadingInstalled(true);
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      setInstalledSkills(data.skills || []);
    } catch { setInstalledSkills([]); }
    finally { setLoadingInstalled(false); }
  }, []);

  useEffect(() => { fetchInstalled(); }, [fetchInstalled]);

  const searchClawHub = useCallback(async (q: string) => {
    if (!q.trim()) { setBrowseResults([]); return; }
    setBrowseLoading(true);
    try {
      const res = await fetch(`/api/skills/search?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setBrowseResults(data.results || []);
    } catch { setBrowseResults([]); }
    finally { setBrowseLoading(false); }
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => searchClawHub(browseQuery), 400);
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
      toast.success(`Created skill: ${customName}`);
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

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const agentOptions = agents.map((a: any) => ({
    id: a.id,
    name: a.identity?.name || a.name || a.id,
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Skills
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Browse ClawHub, install skills, or create your own
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Agent:</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">Default (main)</option>
            {agentOptions.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        {([
          { id: "installed", label: `Installed${installedSkills.length > 0 ? ` · ${installedSkills.length}` : ""}`, icon: <Puzzle className="w-4 h-4" /> },
          { id: "browse", label: "Browse ClawHub", icon: <Search className="w-4 h-4" /> },
          { id: "create", label: "Create Custom", icon: <Plus className="w-4 h-4" /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "var(--accent-foreground, #fff)" : "var(--text-secondary)",
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Installed */}
      {tab === "installed" && (
        <div className="space-y-3">
          {loadingInstalled ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : installedSkills.length === 0 ? (
            <div className="rounded-xl p-12 flex flex-col items-center gap-4 text-center" style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)" }}>
              <Puzzle className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No skills installed</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Browse ClawHub to find skills or create your own</p>
              </div>
              <button onClick={() => setTab("browse")} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}>
                Browse ClawHub
              </button>
            </div>
          ) : (
            installedSkills.map((skill) => (
              <div key={skill.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{skill.emoji || "🧩"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{skill.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: skill.source === "workspace" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--border)",
                        color: skill.source === "workspace" ? "var(--accent)" : "var(--text-muted)",
                      }}>{skill.source}</span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {skill.agents.length > 0 && <span>{skill.agents.join(", ")}</span>}
                    <span>{skill.fileCount} file{skill.fileCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {!loadingInstalled && installedSkills.length > 0 && (
            <button onClick={fetchInstalled} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>
      )}

      {/* Browse ClawHub */}
      {tab === "browse" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Search 13,000+ skills on ClawHub..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              autoFocus
            />
            {browseLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />}
          </div>

          <div className="space-y-2">
            {browseResults.length === 0 && !browseLoading && browseQuery && (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results for "{browseQuery}"</div>
            )}
            {browseResults.map((result) => {
              const isInstalling = installingSlug === result.slug;
              const isInstalled = installedSkills.some((s) => s.id === result.slug);
              const isExpanded = expandedSlug === result.slug;
              return (
                <div key={result.slug} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{result.displayName}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}>{result.slug}</span>
                        {result.version && <span className="text-xs" style={{ color: "var(--text-muted)" }}>v{result.version}</span>}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Updated {formatDate(result.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={`https://clawhub.ai/${result.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => isInstalled ? null : installSkill(result.slug)}
                        disabled={isInstalling || isInstalled}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                        style={{
                          backgroundColor: isInstalled ? "#22c55e20" : "var(--accent)",
                          color: isInstalled ? "#22c55e" : "var(--accent-foreground, #fff)",
                        }}
                      >
                        {isInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : isInstalled ? <CheckCircle className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                        {isInstalling ? "Installing..." : isInstalled ? "Installed" : "Install"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!browseQuery && !browseLoading && (
            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Over 13,000 skills available on{" "}
              <a href="https://clawhub.ai" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>clawhub.ai</a>
            </p>
          )}
        </div>
      )}

      {/* Create Custom */}
      {tab === "create" && (
        <div className="space-y-4">
          <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Skill Name</label>
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
                  slug: {customName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                SKILL.md Content <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional — blank template created if empty)</span>
              </label>
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                rows={12}
                placeholder={`---\nname: My Skill\ndescription: What this skill does\n---\n\n# My Skill\n\nDescribe what this skill does and when to use it.\n\n## Instructions\n\nStep by step instructions for the agent...`}
                className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm font-mono outline-none resize-y transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Skill will be created in the selected agent's workspace/skills/ folder
              </div>
              <button
                onClick={createCustomSkill}
                disabled={creatingCustom || !customName.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
              >
                {creatingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creatingCustom ? "Creating..." : "Create Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}