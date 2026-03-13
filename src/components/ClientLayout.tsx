// src/components/ClientLayout.tsx
"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/unenterOS";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* Outer flex row: sidebar | main column */}
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Sidebar />

        {/* Main column: topbar + content + statusbar */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, padding: "24px" }}>
            {children}
          </main>
          <StatusBar />
        </div>
      </div>

      <AccessibilityOverlay />
    </SidebarProvider>
  );
}