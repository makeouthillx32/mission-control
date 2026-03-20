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
          // Always fixed — never sticky.
          // sticky breaks when any ancestor has overflow:hidden (page-fill, canvas pages, etc.)
          // fixed always works regardless of page content.
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          // Width animates open/closed
          width: isOpen ? "68px" : "0px",
          overflow: "hidden",
          transition: "width 0.2s ease-linear",
          borderRight: isOpen ? "1px solid hsl(var(--border))" : "none",
          backgroundColor: "var(--surface)",
          // High enough to beat Three.js canvas (auto stacking context) and page content
          // but below topbar (z-index 20 sticky header would be above, so we match it)
          zIndex: 45,
          flexShrink: 0,
        }}
        aria-label="Main navigation"
      >
        {/* Inner container — always 68px wide, clips via parent overflow:hidden */}
        <div
          style={{
            width: "68px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 6px",
          }}
        >
          {/* X close button — mobile only */}
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

          {/* Scrollable nav items */}
          <div
            className="sidebar-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
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