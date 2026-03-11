// src/components/ClientLayout.tsx

"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/TenacitOS";
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
          marginLeft: "68px",
          marginTop: "48px",
          marginBottom: "32px",
          minHeight: "calc(100vh - 48px - 32px)",
        }}
      >
        {children}
      </main>

      <StatusBar />
      <AccessibilityOverlay />
    </div>
  );
}