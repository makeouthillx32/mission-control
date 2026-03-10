"use client";

import { Dock, TopBar, StatusBar } from "@/components/TenacitOS";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tenacios-shell"
      style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}
    >
      <Dock />
      <TopBar />

      <main
        style={{
          marginLeft: "68px",   // dock width
          marginTop: "48px",    // top bar height
          marginBottom: "32px", // status bar height
          minHeight: "calc(100vh - 48px - 32px)",
        }}
      >
        {children}
      </main>

      <StatusBar />
    </div>
  );
}