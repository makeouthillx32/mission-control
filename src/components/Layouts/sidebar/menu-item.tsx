// src/components/Layouts/sidebar/menu-item.tsx
"use client";

import Link from "next/link";
import { useState, useRef } from "react";

interface MenuItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  isActive: boolean;
  onNavigate?: () => void;
}

export function MenuItem({ href, label, icon: Icon, isActive, onNavigate }: MenuItemProps) {
  const [tooltipY, setTooltipY] = useState<number | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const showTooltip = () => {
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setTooltipY(rect.top + rect.height / 2);
    }
  };

  const hideTooltip = () => setTooltipY(null);

  return (
    <>
      <Link
        ref={linkRef}
        href={href}
        onClick={onNavigate}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        title={label}
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
          flexShrink: 0,
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
      </Link>

      {/* Tooltip rendered at fixed position — escapes overflow:hidden on sidebar */}
      {tooltipY !== null && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: "76px",   // sidebar width (68px) + 8px gap
            top: tooltipY,
            transform: "translateY(-50%)",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid hsl(var(--border))",
            color: "var(--text-primary)",
            zIndex: 10001,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}