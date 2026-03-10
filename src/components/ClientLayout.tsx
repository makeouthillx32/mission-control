"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { TopBar, StatusBar } from "@/components/TenacitOS";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tenacios-shell"
      style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}
    >
      <Sidebar />
      <TopBar />

      <main
        style={{
          marginLeft: "68px",   // sidebar width
          marginTop: "48px",    // top bar height
          marginBottom: "32px", // status bar height
          minHeight: "calc(100vh - 48px - 32px)",
        }}
      >
        {children}
      </main>

      <StatusBar />

      {/* Full DCG theme + accessibility overlay — light/dark + theme presets */}
      <AccessibilityOverlay />
    </div>
  );
}