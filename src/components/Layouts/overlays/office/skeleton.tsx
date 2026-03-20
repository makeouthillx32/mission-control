// src/components/Layouts/overlays/office/skeleton.tsx
"use client";
import { useOfficeStore } from "./store";

export function OfficeSkeleton() {
  const { loading } = useOfficeStore();
  if (!loading) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(17,24,39,0.85)", pointerEvents: "none" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px", animation: "oc-pulse 1.5s ease-in-out infinite" }}>🏢</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>Loading agents...</p>
      </div>
      <style>{`@keyframes oc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}`}</style>
    </div>
  );
}