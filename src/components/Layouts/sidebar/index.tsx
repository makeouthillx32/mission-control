// src/components/Layouts/sidebar/index.tsx

"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./data";
import { MenuItem } from "./menu-item";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-layout="sidebar"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "68px",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 6px",
        gap: "4px",
        zIndex: 50,
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
          />
        );
      })}
    </aside>
  );
}