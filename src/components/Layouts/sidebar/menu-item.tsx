"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface DockItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}

export function MenuItem({ href, label, icon: Icon, isActive }: DockItemProps) {
  return (
    <Link
      href={href}
      className="dock-item group relative"
      style={{
        width: "56px",
        height: "56px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        borderRadius: "8px",
        backgroundColor: isActive ? "var(--accent-soft)" : "transparent",
        transition: "all 150ms ease",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Icon
        style={{
          width: "22px",
          height: "22px",
          color: isActive ? "var(--accent)" : "var(--text-secondary)",
          strokeWidth: isActive ? 2.5 : 2,
        }}
      />

      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "9px",
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "var(--accent)" : "var(--text-muted)",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "52px",
        }}
      >
        {label.split(" ")[0]}
      </span>

      {/* Tooltip */}
      <span
        className="absolute left-[72px] top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "12px",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </Link>
  );
}