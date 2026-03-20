// src/components/ClientLayout.tsx
"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/Layouts/statusbar";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Sidebar />

        {/* Main column — sits to the right of the sidebar */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <TopBar />

          {/*
           * Main content area.
           * paddingTop: not needed — TopBar is position:sticky so it's in flow.
           * paddingBottom: clears the fixed StatusBar + iOS safe area.
           * Pages can use .page-content / .page-fill etc. for their own centering.
           */}
          <main
            style={{
              flex: 1,
              paddingBottom: "calc(var(--statusbar-h) + env(safe-area-inset-bottom, 0px))",
              minHeight: 0,
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Fixed shell chrome — always on top */}
      <StatusBar />
      <AccessibilityOverlay />
    </SidebarProvider>
  );
}