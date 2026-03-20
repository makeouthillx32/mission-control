// src/components/Layouts/statusbar/index.tsx
"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, ShieldCheck, ShieldOff, Clock } from "lucide-react";

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  firewallActive: boolean;
  activeServices: number;
  totalServices: number;
  uptime: string;
}

function Sep() {
  return <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)", flexShrink: 0 }} />;
}

function Metric({
  icon: Icon,
  label,
  value,
  valueColor,
  barPercent,
  barColor,
  showBar = true,
}: {
  icon: React.ElementType;
  label?: string;
  value: string;
  valueColor?: string;
  barPercent?: number;
  barColor?: string;
  showBar?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
      <Icon style={{ width: "13px", height: "13px", color: "var(--text-muted)", flexShrink: 0 }} />
      {label && (
        <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {label}
        </span>
      )}
      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: valueColor ?? "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {value}
      </span>
      {showBar && barPercent !== undefined && (
        <div style={{ width: "40px", height: "3px", backgroundColor: "var(--surface-elevated)", borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: `${Math.min(100, barPercent)}%`, height: "100%", backgroundColor: barColor, borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}

export function StatusBar() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: { used: 0, total: 4 },
    disk: { used: 0, total: 100 },
    firewallActive: true,
    activeServices: 0,
    totalServices: 4,
    uptime: "0d 0h",
  });

  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/system/stats");
        if (res.ok) setStats(await res.json());
      } catch { /* non-critical */ }
    };
    run();
    const t = setInterval(run, 10000);
    return () => clearInterval(t);
  }, []);

  const cpuColor   = stats.cpu  < 60 ? "var(--positive)" : stats.cpu  < 85 ? "var(--warning)" : "var(--negative)";
  const ramPct     = (stats.ram.used  / stats.ram.total)  * 100;
  const ramColor   = ramPct    < 60 ? "var(--positive)" : ramPct    < 85 ? "var(--warning)" : "var(--negative)";
  const diskPct    = (stats.disk.used / stats.disk.total) * 100;
  const diskColor  = diskPct   < 60 ? "var(--positive)" : diskPct   < 85 ? "var(--warning)" : "var(--negative)";

  const FirewallIcon = stats.firewallActive ? ShieldCheck : ShieldOff;
  const firewallColor = stats.firewallActive ? "var(--positive)" : "var(--negative)";

  const isCompact = width < 850;
  const isTablet  = width >= 850 && width < 1200;

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
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        // High z-index — must beat Three.js WebGL canvas stacking context (typically z-index: auto)
        // and our own z-overlay (100). Three.js creates a new stacking context so we need to be
        // above it at the document level.
        zIndex: 9999,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
      }}
    >
      {/* Centered inner container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "32px",
          maxWidth: "var(--page-max-width, 1400px)",
          margin: "0 auto",
          paddingLeft:  "calc(var(--sidebar-w, 68px) + 24px)",
          paddingRight: "24px",
          gap: "14px",
        }}
      >
        {isCompact ? (
          <>
            <Metric icon={Cpu}         value={`${stats.cpu}%`}                  valueColor={cpuColor} showBar={false} />
            <Sep />
            <Metric icon={MemoryStick} value={`${stats.ram.used.toFixed(1)}GB`} valueColor={ramColor} showBar={false} />
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <FirewallIcon style={{ width: "12px", height: "12px", color: firewallColor }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Firewall</span>
            </div>
          </>
        ) : isTablet ? (
          <>
            <Metric icon={Cpu}         value={`${stats.cpu}%`}                            valueColor={cpuColor}  showBar={false} />
            <Sep />
            <Metric icon={MemoryStick} value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}GB`} valueColor={ramColor}  showBar={false} />
            <Sep />
            <Metric icon={HardDrive}   value={`${diskPct.toFixed(0)}%`}                   valueColor={diskColor} showBar={false} />
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <FirewallIcon style={{ width: "12px", height: "12px", color: firewallColor }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Firewall</span>
            </div>
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{stats.uptime}</span>
            </div>
          </>
        ) : (
          <>
            <Metric icon={Cpu}         label="CPU"  value={`${stats.cpu}%`}                            valueColor={cpuColor}  barPercent={stats.cpu} barColor={cpuColor} />
            <Metric icon={MemoryStick} label="RAM"  value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}GB`} valueColor={ramColor}  barPercent={ramPct}   barColor={ramColor} />
            <Metric icon={HardDrive}   label="DISK" value={`${diskPct.toFixed(0)}%`}                   valueColor={diskColor} barPercent={diskPct}  barColor={diskColor} />
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <FirewallIcon style={{ width: "12px", height: "12px", color: firewallColor }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Firewall</span>
            </div>
            <Sep />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
              SVC {stats.activeServices}/{stats.totalServices}
            </span>
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Uptime: {stats.uptime}</span>
            </div>
          </>
        )}
      </div>

      <style>{`[data-layout="statusbar"]::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}