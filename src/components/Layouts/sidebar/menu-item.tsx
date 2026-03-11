// src/components/Layouts/sidebar/menu-item.tsx
"use client";

import Link from "next/link";

interface MenuItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  isActive: boolean;
  onNavigate?: () => void;
}

export function MenuItem({ href, label, icon: Icon, isActive, onNavigate }: MenuItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className="group"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "56px",
        minHeight: "52px",
        borderRadius: "8px",
        gap: "3px",
        textDecoration: "none",
        backgroundColor: isActive ? "var(--accent-soft)" : "transparent",
        transition: "background-color 150ms ease",
      }}
    >
      <Icon
        style={{
          width: "20px",
          height: "20px",
          color: isActive ? "hsl(var(--primary))" : "var(--text-muted)",
          strokeWidth: isActive ? 2.5 : 2,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "9px",
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "hsl(var(--primary))" : "var(--text-muted)",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "52px",
        }}
      >
        {label.split(" ")[0]}
      </span>

      {/* Hover tooltip */}
      <span
        style={{
          position: "absolute",
          left: "72px",
          top: "50%",
          transform: "translateY(-50%)",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 500,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: 0,
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid hsl(var(--border))",
          color: "var(--text-primary)",
          zIndex: 60,
          transition: "opacity 150ms ease",
        }}
        className="group-hover:opacity-100"
      >
        {label}
      </span>
    </Link>
  );
}