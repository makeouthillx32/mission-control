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
          // overflow:visible so tooltips escape the sidebar boundary
          // Width animation handled by the inner wrapper clipping instead
          overflow: "visible",
          transition: "width 0.2s ease-linear",
          backgroundColor: "var(--surface)",
          borderRight: isOpen ? "1px solid hsl(var(--border))" : "none",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          bottom: isMobile ? 0 : undefined,
          height: "100vh",
          zIndex: isMobile ? 50 : 20,
          flexShrink: 0,
        }}
        aria-label="Main navigation"
      >
        {/* Inner wrapper — clips content to 68px width, tooltips escape via overflow:visible on aside */}
        <div
          style={{
            width: "68px",
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",   // centers items horizontally in the 68px column
            padding: "12px 0",
          }}
        >
          {/* Close button — mobile only */}
          {isMobile && (
            <button
              onClick={() => setIsOpen(false)}
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

          {/* Scrollable nav — centered column */}
          <div
            className="sidebar-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "visible",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              paddingBottom: "8px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
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
        </div>
      </aside>

      <style>{`.sidebar-scroll::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}