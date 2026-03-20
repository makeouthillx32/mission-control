// src/components/ClientLayout.tsx
"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/Layouts/statusbar";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";
import { OfficeSkeleton, OfficeMainOverlay, OfficeExtOverlay } from "@/components/Layouts/overlays/office";
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

      {/* Office overlays — always mounted but self-guard via useOfficeContext() returning null
          when OfficeProvider isn't in the tree (every page except /office).
          On /office, OfficeProvider is mounted by office/page.tsx which wraps the entire
          page subtree, making context available here too since we're in the same React tree. */}
      <OfficeSkeleton />
      <OfficeMainOverlay />
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