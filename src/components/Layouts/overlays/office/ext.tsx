// src/components/Layouts/overlays/office/ext.tsx
"use client";
import { useOfficeStore } from "./store";

export function OfficeExtOverlay() {
  const { active, interactionModal, setInteractionModal, agents, agentStates } = useOfficeStore();
  if (!active || !interactionModal) return null;

  const activeCount = Object.values(agentStates).filter(s => s.status === "working").length;
  const titles = { memory: "📁 Memory Browser", roadmap: "📋 Roadmap & Planning", energy: "☕ Agent Energy Dashboard" };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) setInteractionModal(null); }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.80)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9997, padding: "16px" }}>
      <div style={{ backgroundColor: "#111827", border: "1px solid #eab308", borderRadius: "12px", padding: "32px", maxWidth: "560px", width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, color: "#eab308", margin: 0 }}>{titles[interactionModal]}</h2>
          <button onClick={() => setInteractionModal(null)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "28px", lineHeight: 1, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontFamily: "var(--font-body)", color: "#d1d5db", display: "flex", flexDirection: "column", gap: "16px" }}>
          {interactionModal === "memory" && (<>
            <p style={{ fontSize: "15px", margin: 0 }}>🧠 Access workspace memories and files</p>
            <div style={{ backgroundColor: "#1f2937", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                <li><a href="/memory" style={{ color: "#eab308", textDecoration: "none", fontSize: "14px" }}>→ Full Memory Browser</a></li>
                <li><a href="/files"  style={{ color: "#eab308", textDecoration: "none", fontSize: "14px" }}>→ File Explorer</a></li>
              </ul>
            </div>
          </>)}
          {interactionModal === "roadmap" && (<>
            <p style={{ fontSize: "15px", margin: 0 }}>📋 Project roadmap and planning</p>
            <div style={{ backgroundColor: "#1f2937", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                <li><a href="/cron"     style={{ color: "#eab308", textDecoration: "none", fontSize: "14px" }}>→ Cron Job Manager</a></li>
                <li><a href="/activity" style={{ color: "#eab308", textDecoration: "none", fontSize: "14px" }}>→ Activity Feed</a></li>
              </ul>
            </div>
          </>)}
          {interactionModal === "energy" && (<>
            <p style={{ fontSize: "15px", margin: 0 }}>⚡ Agent activity and energy levels</p>
            <div style={{ backgroundColor: "#1f2937", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px" }}>Active agents:</p>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#4ade80", margin: 0 }}>{activeCount} / {agents.length}</p>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic", margin: 0 }}>Live data from OpenClaw gateway</p>
          </>)}
        </div>
        <button onClick={() => setInteractionModal(null)} style={{ marginTop: "24px", width: "100%", backgroundColor: "#eab308", color: "#000", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}