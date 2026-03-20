// src/components/Layouts/overlays/office/agent-panel.tsx
"use client";
import { X } from "lucide-react";
import { useOfficeStore } from "./store";
import type { AgentConfig, AgentState } from "@/components/Office3D/agentsConfig";

export function OfficeAgentPanel() {
  const { active, loading, selectedAgent, setSelectedAgent, agents, agentStates } = useOfficeStore();
  if (!active || loading || !selectedAgent) return null;

  const agent = agents.find(a => a.id === selectedAgent) as AgentConfig | undefined;
  const state: AgentState = (agentStates[selectedAgent] as AgentState) ?? { id: selectedAgent, status: "idle" };
  if (!agent) return null;

  const statusColor = ({
    working:  { text: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    thinking: { text: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
    error:    { text: "#ef4444", bg: "rgba(239,68,68,0.15)" },
    idle:     { text: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  } as Record<string, {text:string;bg:string}>)[state.status] ?? { text: "#6b7280", bg: "rgba(107,114,128,0.15)" };

  return (
    <div style={{
      position: "fixed",
      top: "var(--topbar-h, 48px)",
      right: 0,
      bottom: "var(--statusbar-h, 32px)",
      width: "min(384px, 90vw)",
      backgroundColor: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "#fff",
      padding: "24px",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      overflowY: "auto",
      zIndex: 46,
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-heading)", margin: 0 }}>
            <span style={{ fontSize: "36px", lineHeight: 1 }}>{agent.emoji}</span>
            {agent.name}
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>{agent.role}</p>
        </div>
        <button onClick={() => setSelectedAgent(null)} style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "999px", backgroundColor: statusColor.bg, width: "fit-content" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: agent.color }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, color: statusColor.text, letterSpacing: "1px" }}>{state.status.toUpperCase()}</span>
      </div>

      {state.currentTask && (
        <div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "#9ca3af", letterSpacing: "1px", marginBottom: "6px" }}>CURRENT TASK</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f3f4f6" }}>{state.currentTask}</p>
        </div>
      )}

      <div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "#9ca3af", letterSpacing: "1px", marginBottom: "10px" }}>STATS</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { label: "Model",     value: state.model || "N/A" },
            { label: "Tokens/hr", value: state.tokensPerHour?.toLocaleString() || "0" },
            { label: "Queue",     value: `${state.tasksInQueue || 0} tasks` },
            { label: "Uptime",    value: `${state.uptime || 0}h` },
          ].map(({ label, value }) => (
            <div key={label} style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "8px" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>{label}</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, textTransform: "capitalize" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "#9ca3af", letterSpacing: "1px", marginBottom: "10px" }}>RECENT ACTIVITY</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { time: "2 min ago",  text: "Completed task: Generate report" },
            { time: "15 min ago", text: `Started: ${state.currentTask || "Processing data"}` },
            { time: "1 hr ago",   text: `Switched model to ${state.model || "sonnet"}` },
          ].map((item, i) => (
            <div key={i} style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "8px" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{item.time}</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "#9ca3af", letterSpacing: "1px", marginBottom: "10px" }}>QUICK ACTIONS</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { label: "Send Message", bg: "rgba(255,255,255,0.08)", color: "#fff" },
            { label: "View History", bg: "rgba(255,255,255,0.08)", color: "#fff" },
            { label: "Change Model", bg: "rgba(255,255,255,0.08)", color: "#fff" },
            { label: "Kill Task",    bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
          ].map(({ label, bg, color }) => (
            <button key={label} style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: bg, border: "none", color, fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}