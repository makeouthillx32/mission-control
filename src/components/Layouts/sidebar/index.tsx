// src/components/Layouts/sidebar/index.tsx
"use client";

import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS } from "./data";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, setIsOpen, isMobile, toggleSidebar } = useSidebarContext();

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        data-layout="sidebar"
        style={{
          width: isOpen ? "68px" : "0px",
          overflow: "hidden",
          transition: "width 0.2s ease-linear",
          borderRight: isOpen ? "1px solid hsl(var(--border))" : "none",
          backgroundColor: "var(--surface)",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          bottom: isMobile ? 0 : undefined,
          height: "100vh",
          zIndex: isMobile ? 50 : undefined,
          flexShrink: 0,
        }}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Inner container fixed at 68px so content doesn't squish during animation */}
        <div style={{
          width: "68px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 6px",
          gap: "4px",
        }}>

          {/* X close button — mobile only */}
          {isMobile && (
            <button
              onClick={toggleSidebar}
              aria-label="Close menu"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "var(--surface-elevated)",
                color: "var(--text-primary)",
                cursor: "pointer",
                marginBottom: "8px",
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          )}

          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <MenuItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                onNavigate={() => isMobile && setIsOpen(false)}
              />
            );
          })}
        </div>
      </aside>
    </>
  );
}