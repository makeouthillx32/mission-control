// src/components/Layouts/overlays/office/main.tsx
"use client";
import { usePathname } from "next/navigation";
import { useOfficeStore } from "./store";

export function OfficeMainOverlay() {
  const pathname = usePathname();
  const { controlMode, setControlMode, agents, agentStates, loading } = useOfficeStore();

  if (pathname !== "/office" || loading) return null;

  const activeCount = Object.values(agentStates).filter(s => s.status === "working").length;

  return (
    <div style={{
      position: "fixed",
      top: "calc(var(--topbar-h, 48px) + 16px)",
      left: "calc(var(--sidebar-w, 68px) + 16px)",
      backgroundColor: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderRadius: "10px",
      padding: "16px",
      color: "#fff",
      zIndex: 45,
      minWidth: "180px",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, margin: "0 0 10px" }}>🏢 The Office</h2>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", lineHeight: 1.6, marginBottom: "10px", color: "rgba(255,255,255,0.85)" }}>
        <p style={{ margin: 0 }}><strong>Mode: {controlMode === "orbit" ? "🖱️ Orbit" : "🎮 FPS"}</strong></p>
        {controlMode === "orbit" ? (
          <><p style={{ margin: 0 }}>🖱️ Drag: Rotate</p><p style={{ margin: 0 }}>🔄 Scroll: Zoom</p><p style={{ margin: 0 }}>👆 Click desk: Agent info</p></>
        ) : (
          <><p style={{ margin: 0 }}>Click to lock cursor</p><p style={{ margin: 0 }}>WASD: Move · Mouse: Look</p><p style={{ margin: 0 }}>ESC: Unlock</p></>
        )}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: "0 0 10px" }}>
        {agents.length} agents · {activeCount} active
      </p>
      <button
        onClick={() => setControlMode(controlMode === "orbit" ? "fps" : "orbit")}
        style={{ width: "100%", backgroundColor: "#eab308", color: "#000", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 700, padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer" }}
      >
        Switch to {controlMode === "orbit" ? "🎮 FPS" : "🖱️ Orbit"}
      </button>
    </div>
  );
}