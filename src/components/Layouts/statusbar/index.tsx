// src/components/Layouts/statusbar/index.tsx
"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, ShieldCheck, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface StatusMetricProps {
  icon: React.ElementType;
  label: string;
  value: string;
  barPercent?: number;
  color?: string;
}

function StatusMetric({ icon: Icon, label, value, barPercent, color }: StatusMetricProps) {
  return (
    <div className="flex items-center gap-1.5" style={{ height: "24px" }}>
      <Icon style={{ width: "14px", height: "14px", color: "var(--text-muted)", flexShrink: 0 }} />
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
          color: "var(--text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      {barPercent !== undefined && (
        <div
          style={{
            width: "48px",
            height: "4px",
            backgroundColor: "var(--surface-elevated)",
            borderRadius: "2px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: `${Math.min(100, barPercent)}%`,
              height: "100%",
              backgroundColor: color,
              borderRadius: "2px",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Separator() {
  return (
    <div
      style={{
        width: "1px",
        height: "16px",
        backgroundColor: "var(--border)",
        flexShrink: 0,
      }}
    />
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <div
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: active ? "var(--positive)" : "var(--negative)",
        flexShrink: 0,
      }}
    />
  );
}

export function StatusBar() {
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);

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

  // Tablet = 850px–1200px
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 850 && w < 1200);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/system/stats");
        if (res.ok) setStats(await res.json());
      } catch {
        // non-critical
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Hidden on mobile — status bar is a desktop/PWA desktop concept
  if (isMobile) return null;

  const cpuColor =
    stats.cpu < 60 ? "var(--positive)" : stats.cpu < 85 ? "var(--warning)" : "var(--negative)";
  const ramPercent = (stats.ram.used / stats.ram.total) * 100;
  const ramColor =
    ramPercent < 60 ? "var(--positive)" : ramPercent < 85 ? "var(--warning)" : "var(--negative)";
  const diskPercent = (stats.disk.used / stats.disk.total) * 100;
  const diskColor =
    diskPercent < 60 ? "var(--positive)" : diskPercent < 85 ? "var(--warning)" : "var(--negative)";

  return (
    <>
      <div
        data-layout="statusbar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          // Respect iOS/PWA home indicator and browser chrome
          height: "calc(32px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          // 84px left pad accounts for the sidebar width on desktop
          padding: `0 16px env(safe-area-inset-bottom, 0px) 84px`,
          gap: "16px",
          zIndex: 40,
          overflowX: "auto",
          overflowY: "hidden",
          // Hide scrollbar — content scrolls if viewport is very narrow
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {isTablet ? (
          // ── Tablet: condensed — just dots + key numbers, no mini-bars ──
          <>
            <div className="flex items-center gap-1.5">
              <Cpu style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: cpuColor, whiteSpace: "nowrap" }}>
                {stats.cpu}%
              </span>
            </div>

            <Separator />

            <div className="flex items-center gap-1.5">
              <MemoryStick style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, color: ramColor, whiteSpace: "nowrap" }}>
                {stats.ram.used.toFixed(1)}GB
              </span>
            </div>

            <Separator />

            <div className="flex items-center gap-1.5">
              <StatusDot active={stats.vpnActive} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                VPN
              </span>
              <ShieldCheck style={{ width: "12px", height: "12px", color: stats.firewallActive ? "var(--positive)" : "var(--negative)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                UFW
              </span>
            </div>

            <Separator />

            <div className="flex items-center gap-1">
              <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {stats.uptime}
              </span>
            </div>
          </>
        ) : (
          // ── Desktop: full layout ──
          <>
            <StatusMetric icon={Cpu} label="CPU" value={`${stats.cpu}%`} barPercent={stats.cpu} color={cpuColor} />
            <StatusMetric
              icon={MemoryStick}
              label="RAM"
              value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}GB`}
              barPercent={ramPercent}
              color={ramColor}
            />
            <StatusMetric
              icon={HardDrive}
              label="DISK"
              value={`${diskPercent.toFixed(0)}%`}
              barPercent={diskPercent}
              color={diskColor}
            />

            <Separator />

            <div className="flex items-center gap-1">
              <StatusDot active={stats.vpnActive} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                VPN
              </span>
            </div>

            <div className="flex items-center gap-1">
              <ShieldCheck
                style={{
                  width: "12px",
                  height: "12px",
                  color: stats.firewallActive ? "var(--positive)" : "var(--negative)",
                }}
              />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                UFW
              </span>
            </div>

            <Separator />

            <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              SVC: {stats.activeServices}/{stats.totalServices}
            </span>

            <Separator />

            <div className="flex items-center gap-1">
              <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                Uptime: {stats.uptime}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Spacer so page content doesn't sit under the fixed bar */}
      <div
        style={{
          height: "calc(32px + env(safe-area-inset-bottom, 0px))",
          flexShrink: 0,
        }}
      />

      <style>{`
        [data-layout="statusbar"]::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}