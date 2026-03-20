// src/components/Layouts/statusbar/index.tsx
"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, ShieldCheck, Clock } from "lucide-react";

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  vpnActive: boolean;
  firewallActive: boolean;
  activeServices: number;
  totalServices: number;
  uptime: string;
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  barPercent,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  barPercent?: number;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "24px", flexShrink: 0 }}>
      <Icon style={{ width: "14px", height: "14px", color: "var(--text-muted)", flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {value}
      </span>
      {barPercent !== undefined && (
        <div style={{ width: "48px", height: "4px", backgroundColor: "var(--surface-elevated)", borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: `${Math.min(100, barPercent)}%`, height: "100%", backgroundColor: color, borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}

function Sep() {
  return <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)", flexShrink: 0 }} />;
}

export function StatusBar() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: { used: 0, total: 4 },
    disk: { used: 0, total: 100 },
    vpnActive: false,
    firewallActive: true,
    activeServices: 0,
    totalServices: 4,
    uptime: "0d 0h",
  });

  // Track viewport width for responsive content only — never hides the bar
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/system/stats");
        if (res.ok) setStats(await res.json());
      } catch { /* non-critical */ }
    };
    fetch_();
    const t = setInterval(fetch_, 10000);
    return () => clearInterval(t);
  }, []);

  const cpuColor   = stats.cpu < 60      ? "var(--positive)" : stats.cpu < 85      ? "var(--warning)" : "var(--negative)";
  const ramPct     = (stats.ram.used  / stats.ram.total)  * 100;
  const ramColor   = ramPct < 60         ? "var(--positive)" : ramPct < 85          ? "var(--warning)" : "var(--negative)";
  const diskPct    = (stats.disk.used / stats.disk.total) * 100;
  const diskColor  = diskPct < 60        ? "var(--positive)" : diskPct < 85         ? "var(--warning)" : "var(--negative)";

  // Breakpoints for content — bar itself is ALWAYS visible
  const isCompact  = width < 850;   // collapsed sidebar mode — minimal content
  const isTablet   = width >= 850 && width < 1200; // sidebar visible but tight

  return (
    <div
      data-layout="statusbar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "32px",
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        // Safe area for iOS PWA home indicator
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "84px",   // sidebar width clearance
        paddingRight: "16px",
        gap: "14px",
        zIndex: 40,
        // Scroll horizontally if viewport is very narrow rather than clipping
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
      }}
    >
      {isCompact ? (
        // ── Compact: sidebar collapsed, narrow viewport ──
        // Show only the most critical status at-a-glance
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <Cpu style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: cpuColor, whiteSpace: "nowrap" }}>
              {stats.cpu}%
            </span>
          </div>

          <Sep />

          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <MemoryStick style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: ramColor, whiteSpace: "nowrap" }}>
              {stats.ram.used.toFixed(1)}GB
            </span>
          </div>

          <Sep />

          {/* VPN + UFW dots */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: stats.vpnActive ? "var(--positive)" : "var(--negative)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>VPN</span>
            <ShieldCheck style={{ width: "12px", height: "12px", color: stats.firewallActive ? "var(--positive)" : "var(--negative)" }} />
          </div>
        </>
      ) : isTablet ? (
        // ── Tablet: sidebar visible but space is tighter — no progress bars ──
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <Cpu style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: cpuColor, whiteSpace: "nowrap" }}>{stats.cpu}%</span>
          </div>
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <MemoryStick style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: ramColor, whiteSpace: "nowrap" }}>{stats.ram.used.toFixed(1)}/{stats.ram.total}GB</span>
          </div>
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <HardDrive style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: diskColor, whiteSpace: "nowrap" }}>{diskPct.toFixed(0)}%</span>
          </div>
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: stats.vpnActive ? "var(--positive)" : "var(--negative)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>VPN</span>
            <ShieldCheck style={{ width: "12px", height: "12px", color: stats.firewallActive ? "var(--positive)" : "var(--negative)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>UFW</span>
          </div>
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{stats.uptime}</span>
          </div>
        </>
      ) : (
        // ── Desktop: full layout with progress bars ──
        <>
          <StatusMetric icon={Cpu}        label="CPU"  value={`${stats.cpu}%`}                            barPercent={stats.cpu} color={cpuColor} />
          <StatusMetric icon={MemoryStick} label="RAM"  value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}GB`} barPercent={ramPct}   color={ramColor} />
          <StatusMetric icon={HardDrive}  label="DISK" value={`${diskPct.toFixed(0)}%`}                   barPercent={diskPct}   color={diskColor} />
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: stats.vpnActive ? "var(--positive)" : "var(--negative)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>VPN</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <ShieldCheck style={{ width: "12px", height: "12px", color: stats.firewallActive ? "var(--positive)" : "var(--negative)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>UFW</span>
          </div>
          <Sep />
          <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
            SVC: {stats.activeServices}/{stats.totalServices}
          </span>
          <Sep />
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Uptime: {stats.uptime}</span>
          </div>
        </>
      )}

      <style>{`[data-layout="statusbar"]::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}