// src/components/system/ServicesTable.tsx
"use client";

import { RotateCw, Play, Square, Loader2, Terminal } from "lucide-react";

interface Service {
  name: string;
  status: string;
  description: string;
  backend?: string;
  critical?: boolean;
  uptime?: string | null;
  image?: string | null;
  // legacy fields kept for compat
  restarts?: number;
  mem?: number | null;
  cpu?: number | null;
}

interface Props {
  services: Service[];
  activeCount: number;
  actionLoading: Record<string, boolean>;
  onAction: (svc: Service, action: "restart" | "stop" | "start" | "logs") => void;
}

function statusColor(status: string) {
  switch (status) {
    case "running": case "active": return "var(--positive)";
    case "exited":  case "failed": return "var(--negative)";
    case "restarting": return "var(--warning)";
    case "not_deployed": return "var(--info, #3b82f6)";
    default: return "var(--text-muted)";
  }
}

function statusBg(status: string) {
  switch (status) {
    case "running": case "active": return "var(--positive-soft)";
    case "exited":  case "failed": return "var(--negative-soft)";
    case "restarting": return "var(--warning-soft)";
    case "not_deployed": return "rgba(59,130,246,0.12)";
    default: return "var(--surface-elevated)";
  }
}

function statusLabel(status: string) {
  if (status === "running") return "running";
  if (status === "not_deployed") return "not deployed";
  if (status === "not_found") return "not found";
  return status;
}

export function ServicesTable({ services, activeCount, actionLoading, onAction }: Props) {
  return (
    <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <span style={{ fontSize: "16px" }}>🐳</span>
        Docker Containers ({activeCount}/{services.length} running)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Container</th>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Description</th>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const isRunning   = svc.status === "running" || svc.status === "active";
              const isActionable = svc.backend !== "none" && svc.status !== "not_deployed" && svc.status !== "not_found";
              const restartKey  = `${svc.name}-restart`;
              const stopKey     = `${svc.name}-stop`;
              const logsKey     = `${svc.name}-logs`;

              return (
                <tr key={svc.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-3">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>{svc.name}</span>
                      {svc.critical && (
                        <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", backgroundColor: "var(--warning-soft)", color: "var(--warning)", fontWeight: 700, letterSpacing: "0.5px" }}>CORE</span>
                      )}
                    </div>
                    {svc.image && <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{svc.image}</span>}
                  </td>
                  <td className="py-3 px-3">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{svc.description || "—"}</span>
                      {svc.uptime && isRunning && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>up {svc.uptime}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0, backgroundColor: statusColor(svc.status), boxShadow: isRunning ? `0 0 5px ${statusColor(svc.status)}` : "none" }} />
                      <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, backgroundColor: statusBg(svc.status), color: statusColor(svc.status) }}>
                        {statusLabel(svc.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "2px" }}>
                      {isActionable && (
                        <>
                          <button onClick={() => onAction(svc, "restart")} disabled={actionLoading[restartKey]}
                            title="Restart" style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                            {actionLoading[restartKey] ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <RotateCw style={{ width: "14px", height: "14px" }} />}
                          </button>
                          <button onClick={() => onAction(svc, isRunning ? "stop" : "start")} disabled={actionLoading[stopKey]}
                            title={isRunning ? "Stop" : "Start"} style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", color: isRunning ? "var(--negative)" : "var(--positive)" }}>
                            {isRunning ? <Square style={{ width: "14px", height: "14px" }} /> : <Play style={{ width: "14px", height: "14px" }} />}
                          </button>
                          <button onClick={() => onAction(svc, "logs")} disabled={actionLoading[logsKey]}
                            title="Logs" style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                            {actionLoading[logsKey] ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Terminal style={{ width: "14px", height: "14px" }} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}