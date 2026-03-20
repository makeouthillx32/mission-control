// src/components/ClientLayout.tsx
"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/Layouts/statusbar";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";
import {
  OfficeSkeleton,
  OfficeMainOverlay,
  OfficeAgentPanel,
  OfficeExtOverlay,
} from "@/components/Layouts/overlays/office";
import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile } = useSidebarContext();
  const sidebarOffset = !isMobile && isOpen ? "68px" : "0px";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Sidebar />

      <div
        style={{
          marginLeft: sidebarOffset,
          transition: "margin-left 0.2s ease-linear",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <TopBar />
        <main
          style={{
            flex: 1,
            paddingBottom: "calc(var(--statusbar-h, 32px) + env(safe-area-inset-bottom, 0px))",
            minHeight: 0,
          }}
        >
          {children}
        </main>
      </div>

      {/* Always-on shell overlays */}
      <StatusBar />
      <AccessibilityOverlay />

      {/* Office overlay stack — all self-guard via pathname + store state */}
      <OfficeSkeleton />
      <OfficeMainOverlay />
      <OfficeAgentPanel />
      <OfficeExtOverlay />
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutShell>{children}</LayoutShell>
    </SidebarProvider>
  );
}