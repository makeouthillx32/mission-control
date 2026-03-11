// src/app/(dashboard)/layout.tsx

"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { TopBar } from "@/components/Layouts/dashboard";
import { StatusBar } from "@/components/TenacitOS";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tenacios-shell" style={{ minHeight: "100vh" }}>
      <Sidebar />
      <TopBar />

      <main
        style={{
          marginLeft: "68px",
          marginTop: "48px",
          marginBottom: "32px",
          minHeight: "calc(100vh - 48px - 32px)",
          padding: "24px",
        }}
      >
        {children}
      </main>

      <StatusBar />
    </div>
  );
}