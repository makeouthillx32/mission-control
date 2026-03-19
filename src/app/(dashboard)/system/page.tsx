// src/app/(dashboard)/system/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu, HardDrive, MemoryStick, Network, Server,
  ShieldCheck, Wifi, X, Loader2, ArrowDown, ArrowUp, ExternalLink,
} from "lucide-react";
import { ServicesTable } from "@/components/system/ServicesTable";

interface ServiceEntry {
  name: string; status: string; description: string;
  backend?: string; critical?: boolean; uptime?: string | null; image?: string | null;
}

interface GatewayNodeRow {
  id: string; hostname: string; label: string; ip: string | null; port: number;
  role: string; os: string | null; is_online: boolean; last_seen: string | null;
  active_agents: number; gateway_model: string | null; notes: string | null;
}

interface FirewallRule { port: string; action: string; from: string; comment: string; }

interface SystemData {
  cpu:      { usage: number; cores: number[]; loadAvg: number[] };
  ram:      { total: number; used: number; free: number; cached: number };
  disk:     { total: number; used: number; free: number; percent: number };
  network:  { rx: number; tx: number };
  systemd:  ServiceEntry[];
  tailscale: { active: boolean; ip: string | null; devices: GatewayNodeRow[] };
  firewall: { active: boolean; rules: FirewallRule[]; ruleCount: number };
}

interface LogsModal { name: string; content: string; loading: boolean; }

const OS_EMOJI: Record<string, string> = { windows: "🪟", linux: "🐧", android: "🤖", macos: "🍎" };

function timeSince(iso: string | null) {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function SystemMonitorPage() {
  const router = useRouter();
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<"hardware" | "services">("hardware");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [logsModal, setLogsModal]   = useState<LogsModal | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/system/monitor");
        if (res.ok) { setSystemData(await res.json()); setLastUpdated(new Date()); }
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (svc: ServiceEntry, action: "restart" | "stop" | "start" | "logs") => {
    const key = `${svc.name}-${action}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      if (action === "logs") setLogsModal({ name: svc.name, content: "", loading: true });
      const res = await fetch("/api/system/services", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: svc.name, backend: "docker", action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (action === "logs") {
        setLogsModal({ name: svc.name, content: data.output, loading: false });
      } else {
        showToast(`✅ ${svc.name}: ${action} successful`);
        setTimeout(async () => { const r = await fetch("/api/system/monitor"); if (r.ok) setSystemData(await r.json()); }, 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      if (action === "logs") setLogsModal({ name: svc.name, content: `Error: ${msg}`, loading: false });
      else showToast(`❌ ${svc.name}: ${msg}`, "error");
    } finally { setActionLoading(p => ({ ...p, [key]: false })); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "hsl(var(--primary))" }} />
        <p style={{ color: "var(--text-secondary)" }}>Loading system data...</p>
      </div>
    </div>
  );

  if (!systemData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Server className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-secondary)" }}>Failed to load system data</p>
      </div>
    </div>
  );

  const cpuColor  = systemData.cpu.usage < 60 ? "var(--positive)" : systemData.cpu.usage < 85 ? "var(--warning)" : "var(--negative)";
  const ramPct    = (systemData.ram.used / systemData.ram.total) * 100;
  const ramColor  = ramPct < 60 ? "var(--positive)" : ramPct < 85 ? "var(--warning)" : "var(--negative)";
  const diskColor = systemData.disk.percent < 60 ? "var(--positive)" : systemData.disk.percent < 85 ? "var(--warning)" : "var(--negative)";
  const activeServices = systemData.systemd.filter(s => s.status === "running" || s.status === "active").length;

  return (
    <div className="space-y-6">
      {toast && (
        <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000, padding: "0.75rem 1.25rem", borderRadius: "0.75rem", backgroundColor: toast.type === "success" ? "var(--positive-soft)" : "var(--negative-soft)", border: `1px solid ${toast.type === "success" ? "var(--positive)" : "var(--negative)"}`, color: toast.type === "success" ? "var(--positive)" : "var(--negative)", fontSize: "0.9rem", fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>System Monitor</h1>
          <p style={{ color: "var(--text-secondary)" }}>Real-time monitoring of POWER — host machine + Docker stack</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--positive-soft)", color: "var(--positive)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--positive)" }} /> Live
          </span>
          {lastUpdated && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lastUpdated.toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {[{ id: "hardware", label: "Hardware", Icon: Cpu }, { id: "services", label: "Services", Icon: Server }].map(({ id, label, Icon }) => {
          const active = selectedTab === id;
          return (
            <button key={id} onClick={() => setSelectedTab(id as "hardware" | "services")}
              className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
              style={{ color: active ? "hsl(var(--primary))" : "var(--text-secondary)", borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent" }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          );
        })}
      </div>

      {selectedTab === "hardware" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CPU */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}><Cpu className="w-5 h-5" style={{ color: cpuColor }} /></div>
                <div><h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>CPU</h3><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.cpu.cores.length} cores · i9-14900K</p></div>
              </div>
              <span className="text-2xl font-bold" style={{ color: cpuColor }}>{systemData.cpu.usage}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${systemData.cpu.usage}%`, backgroundColor: cpuColor }} />
            </div>
            <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Load Average</span>
              <span>{systemData.cpu.loadAvg[0].toFixed(2)} / {systemData.cpu.loadAvg[1].toFixed(2)} / {systemData.cpu.loadAvg[2].toFixed(2)}</span>
            </div>
          </div>

          {/* RAM */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}><MemoryStick className="w-5 h-5" style={{ color: ramColor }} /></div>
                <div><h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>RAM</h3><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.ram.used.toFixed(1)} / {systemData.ram.total.toFixed(1)} GB</p></div>
              </div>
              <span className="text-2xl font-bold" style={{ color: ramColor }}>{ramPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${ramPct}%`, backgroundColor: ramColor }} />
            </div>
          </div>

          {/* Disk */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}><HardDrive className="w-5 h-5" style={{ color: diskColor }} /></div>
                <div><h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Disk</h3><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.disk.used} / {systemData.disk.total} GB</p></div>
              </div>
              <span className="text-2xl font-bold" style={{ color: diskColor }}>{systemData.disk.percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${systemData.disk.percent}%`, backgroundColor: diskColor }} />
            </div>
          </div>

          {/* Network */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}><Network className="w-5 h-5" style={{ color: "var(--info, #3b82f6)" }} /></div>
              <div><h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Network</h3><p className="text-sm" style={{ color: "var(--text-secondary)" }}>Container I/O</p></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><ArrowDown className="w-4 h-4" style={{ color: "var(--positive)" }} /><span>RX (in)</span></div>
                <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{systemData.network.rx.toFixed(2)} MB/s</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><ArrowUp className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} /><span>TX (out)</span></div>
                <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{systemData.network.tx.toFixed(2)} MB/s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "services" && (
        <div className="space-y-6">
          <ServicesTable services={systemData.systemd} activeCount={activeServices} actionLoading={actionLoading} onAction={handleAction} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Network Environments */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                    <Wifi className="w-5 h-5" style={{ color: systemData.tailscale.active ? "var(--positive)" : "var(--text-muted)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Network Environments</h3>
                    <p className="text-sm" style={{ color: systemData.tailscale.active ? "var(--positive)" : "var(--text-muted)" }}>
                      {systemData.tailscale.devices.filter((d: GatewayNodeRow) => d.is_online).length} online
                    </p>
                  </div>
                </div>
                <button onClick={() => router.push("/nodes")} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Manage <ExternalLink style={{ width: "11px", height: "11px" }} />
                </button>
              </div>
              {systemData.tailscale.devices.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No environments registered. <button onClick={() => router.push("/nodes")} style={{ color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>Add one →</button></p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(systemData.tailscale.devices as GatewayNodeRow[]).map(node => (
                    <div key={node.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "var(--radius-md)", backgroundColor: "var(--card-elevated)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: node.is_online ? "var(--positive)" : "var(--text-muted)", flexShrink: 0 }} />
                        <span style={{ fontSize: "13px" }}>{OS_EMOJI[node.os ?? ""] ?? "🖥️"}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{node.label}</span>
                        {node.active_agents > 0 && node.is_online && <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{node.active_agents} agents</span>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>{node.ip ?? "—"}</span>
                        <div style={{ fontSize: "10px", color: node.is_online ? "var(--positive)" : "var(--text-muted)" }}>{node.is_online ? "online" : timeSince(node.last_seen)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Firewall */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <ShieldCheck className="w-5 h-5" style={{ color: systemData.firewall.active ? "var(--positive)" : "var(--negative)" }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Firewall (UFW)</h3>
                  <p className="text-sm" style={{ color: systemData.firewall.active ? "var(--positive)" : "var(--text-muted)" }}>
                    {systemData.firewall.active ? "Active" : "Not available — Docker on Windows"}
                  </p>
                </div>
              </div>
              {systemData.firewall.rules.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No UFW rules detected. Network isolation is handled by Docker Desktop and Windows Firewall.</p>
              ) : (
                <div className="space-y-2">
                  {systemData.firewall.rules.map((rule, i) => (
                    <div key={i} className="flex items-start justify-between text-xs py-1.5" style={{ borderBottom: i < systemData.firewall.rules.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{rule.port}</span>
                          <span style={{ padding: "1px 6px", borderRadius: "3px", fontSize: "9px", backgroundColor: "var(--positive-soft)", color: "var(--positive)", fontWeight: 700 }}>{rule.action}</span>
                        </div>
                        {rule.comment && <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{rule.comment}</span>}
                      </div>
                      <span className="font-mono" style={{ color: "var(--text-secondary)", maxWidth: "120px", wordBreak: "break-all", textAlign: "right", fontSize: "10px" }}>{rule.from}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ width: "95vw", maxWidth: "900px", height: "80vh", backgroundColor: "#0d1117", borderRadius: "1rem", border: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <span>🐳</span>
              <span style={{ color: "#c9d1d9", fontFamily: "monospace", fontSize: "0.9rem" }}>{logsModal.name}</span>
              <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>docker logs</span>
              <button onClick={() => setLogsModal(null)} style={{ marginLeft: "auto", padding: "0.375rem", borderRadius: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "#8b949e" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
              {logsModal.loading
                ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} /></div>
                : <pre style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#c9d1d9", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>{logsModal.content || "No output"}</pre>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}