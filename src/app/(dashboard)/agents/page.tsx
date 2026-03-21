"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Circle,
  MessageSquare,
  HardDrive,
  Shield,
  Users,
  Activity,
  ExternalLink,
  GitBranch,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { AgentOrganigrama } from "@/components/AgentOrganigrama";
import { useOpenClawAgents } from "@/hooks/use-openclaw-agents";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  workspace: string;
  dmPolicy?: string;
  allowAgents: string[];
  allowAgentsDetails?: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>;
  botToken?: string;
  status: "online" | "offline";
  lastActivity?: string;
  activeSessions: number;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"cards" | "organigrama">("cards");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { deleteAgent } = useOpenClawAgents();

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteAgent(id);
      await fetchAgents();
    } catch (err) {
      console.error("Failed to delete agent:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg" style={{ color: "var(--text-muted)" }}>
            Loading agents...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-1.5px",
            }}
          >
            <Users className="inline-block w-8 h-8 mr-2 mb-1" />
            Agents
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Multi-agent system overview • {agents.length} agents configured
          </p>
        </div>

        <button
          onClick={() => router.push("/agents/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 shrink-0"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground, #fff)",
          }}
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "cards" as const, label: "Agent Cards", icon: LayoutGrid },
          { id: "organigrama" as const, label: "Organigrama", icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
            style={{
              fontSize: "14px",
              color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottomStyle: "solid",
              borderBottomWidth: "2px",
              borderBottomColor: activeTab === id ? "var(--accent)" : "transparent",
              paddingBottom: "0.5rem",
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Organigrama View */}
      {activeTab === "organigrama" && (
        <div
          className="rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Agent Hierarchy
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Visualization of agent communication allowances
            </p>
          </div>
          <AgentOrganigrama agents={agents} />
        </div>
      )}

      {/* Agents Grid */}
      {activeTab === "cards" && (
        <>
          {agents.length === 0 ? (
            <div
              className="rounded-xl p-12 flex flex-col items-center gap-4 text-center"
              style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "var(--card-elevated)" }}
              >
                <Bot className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  No agents configured
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Add your first agent to get started
                </p>
              </div>
              <button
                onClick={() => router.push("/agents/new")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground, #fff)" }}
              >
                <Plus className="w-4 h-4" />
                New Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Header with status */}
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: `linear-gradient(135deg, ${agent.color}15, transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: `${agent.color}20`,
                          border: `2px solid ${agent.color}`,
                        }}
                      >
                        {agent.emoji}
                      </div>
                      <div>
                        <h3
                          className="text-lg font-bold"
                          style={{
                            fontFamily: "var(--font-heading)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Circle
                            className="w-2 h-2"
                            style={{
                              fill: agent.status === "online" ? "#4ade80" : "#6b7280",
                              color: agent.status === "online" ? "#4ade80" : "#6b7280",
                            }}
                          />
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: agent.status === "online" ? "#4ade80" : "var(--text-muted)",
                            }}
                          >
                            {agent.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {agent.botToken && (
                        <div title="Telegram Bot Connected">
                          <MessageSquare className="w-5 h-5" style={{ color: "#0088cc" }} />
                        </div>
                      )}

                      {/* Edit button */}
                      <button
                        onClick={() => router.push(`/agents/${agent.id}`)}
                        title="Edit agent"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "var(--text-primary)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "var(--text-muted)")
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(agent.id)}
                        title={
                          confirmDeleteId === agent.id ? "Click again to confirm" : "Delete agent"
                        }
                        disabled={deletingId === agent.id}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{
                          color:
                            confirmDeleteId === agent.id
                              ? "#ef4444"
                              : "var(--text-muted)",
                        }}
                        onMouseEnter={(e) => {
                          if (deletingId !== agent.id)
                            e.currentTarget.style.color = "#ef4444";
                        }}
                        onMouseLeave={(e) => {
                          if (confirmDeleteId !== agent.id)
                            e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        {deletingId === agent.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId === agent.id && (
                    <div
                      className="px-5 py-2 text-xs flex items-center justify-between"
                      style={{
                        backgroundColor: "#ef444415",
                        borderBottom: "1px solid var(--border)",
                        color: "#ef4444",
                      }}
                    >
                      <span>Delete &quot;{agent.name}&quot;? This cannot be undone.</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="underline ml-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-5 space-y-4">
                    {/* Model */}
                    <div className="flex items-start gap-3">
                      <Bot className="w-4 h-4 mt-0.5" style={{ color: agent.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                          Model
                        </div>
                        <div
                          className="text-sm font-mono truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {agent.model}
                        </div>
                      </div>
                    </div>

                    {/* Workspace */}
                    <div className="flex items-start gap-3">
                      <HardDrive className="w-4 h-4 mt-0.5" style={{ color: agent.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                          Workspace
                        </div>
                        <div
                          className="text-sm font-mono truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={agent.workspace}
                        >
                          {agent.workspace}
                        </div>
                      </div>
                    </div>

                    {/* DM Policy */}
                    {agent.dmPolicy && (
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 mt-0.5" style={{ color: agent.color }} />
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                            DM Policy
                          </div>
                          <div
                            className="text-sm capitalize"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {agent.dmPolicy}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-agents */}
                    {agent.allowAgentsDetails && agent.allowAgentsDetails.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 mt-0.5" style={{ color: agent.color }} />
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                            Sub-agents
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {agent.allowAgentsDetails.map((sub) => (
                              <span
                                key={sub.id}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                                style={{
                                  backgroundColor: `${sub.color}20`,
                                  border: `1px solid ${sub.color}40`,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {sub.emoji} {sub.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer: last activity + edit link */}
                    <div
                      className="flex items-center justify-between pt-2"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatLastActivity(agent.lastActivity)}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/agents/${agent.id}`)}
                        className="flex items-center gap-1 text-xs font-medium transition-colors"
                        style={{ color: "var(--accent)" }}
                      >
                        Edit
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}