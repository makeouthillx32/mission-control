// src/components/Layouts/dashboard/index.tsx
"use client";

import { useState, useEffect } from "react";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import SwitchtoDarkMode from "@/components/Layouts/SwitchtoDarkMode";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export function TopBar() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const [showSearch, setShowSearch] = useState(false);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      <header
        data-layout="topbar"
        style={{
          position: "sticky",
          top: 0,
          height: "48px",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid hsl(var(--border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 40,
        }}
      >
        {/* Left — hamburger (mobile only) + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Hamburger — mobile only */}
          <button
            onClick={toggleSidebar}
            style={{
              display: isMobile ? "flex" : "none",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 6px",
              borderRadius: "var(--radius-md)",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <MenuIcon />
            <span className="sr-only">Toggle Sidebar</span>
          </button>

          {/* Logo + name */}
          <span style={{ fontSize: "20px", lineHeight: 1 }}>🦞</span>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            unenterOS
          </h1>
          <div
            style={{
              backgroundColor: "var(--accent-soft)",
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "9px",
                fontWeight: 700,
                color: "hsl(var(--primary))",
                letterSpacing: "1px",
              }}
            >
              v1.0
            </span>
          </div>
        </div>

        {/* Right — search + theme + notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: isMobile ? "36px" : "200px",
              height: "32px",
              backgroundColor: "var(--surface-elevated)",
              borderRadius: "6px",
              padding: isMobile ? "0 8px" : "0 12px",
              border: "1px solid hsl(var(--border))",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "12px",
              overflow: "hidden",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            {!isMobile && <span>Search... ⌘K</span>}
          </button>

          <div style={{ display: "flex", alignItems: "center" }}>
            {isMobile ? <SwitchtoDarkMode /> : <ThemeToggleSwitch />}
          </div>

          <NotificationDropdown />
        </div>
      </header>
    </>
  );
}