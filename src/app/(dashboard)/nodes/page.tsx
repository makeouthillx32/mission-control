// src/app/(dashboard)/nodes/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useOpenClawNodes } from "@/hooks/use-openclaw-nodes";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { AddNodeModal } from "@/components/nodes/AddNodeModal";
import { OS_EMOJI, ROLE_META } from "@/lib/nodes";
import type { GatewayNode } from "@/types/nodes";
import {
  Server, Smartphone, RefreshCw, Loader2,
  Check, X, Trash2, Edit2, Monitor,
  AlertCircle, Plus, ExternalLink,
} from "lucide-react";

function timeSince(iso: string | null) {
  if (!iso) return "never";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function NodesPage() {
  const [gwNodes,   setGwNodes]   = useState<GatewayNode[]>([]);
  const [gwLoading, setGwLoading] = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const fetchGwNodes = useCallback(async () => {
    setGwLoading(true);
    try {
      const res = await fetch("/api/nodes");
      if (res.ok) setGwNodes(await res.json());
    } finally { setGwLoading(false); }
  }, []);

  useEffect(() => { fetchGwNodes(); }, [fetchGwNodes]);

  const deleteNode = async (id: string) => {
    if (deleting !== id) { setDeleting(id); return; }
    await fetch("/api/nodes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleting(null);
    fetchGwNodes();
  };

  const { isConnected } = useOpenClaw();
  const { nodes: ocNodes, devices, loading: ocLoading, error: ocError, refresh, renameNode, removeDevice } = useOpenClawNodes();
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editName,    setEditName]    = useState("");

  const handleRename = async (nodeId: string) => {
    if (!editName.trim()) return;
    await renameNode(nodeId, editName.trim());
    setEditingNode(null); setEditName("");
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ══ Environments (gateway_nodes — infrastructure) ══ */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Environments</h1>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Machines running OpenClaw gateway or Docker — click to manage</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={fetchGwNodes} style={{ padding: "7px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
              <RefreshCw style={{ width: "14px", height: "14px" }} className={gwLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              <Plus style={{ width: "14px", height: "14px" }} /> Add environment
            </button>
          </div>
        </div>

        {gwLoading && gwNodes.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "32px", justifyContent: "center", color: "var(--text-muted)" }}>
            <Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />
            <span style={{ fontSize: "13px" }}>Loading environments...</span>
          </div>
        ) : gwNodes.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
            <Server style={{ width: "32px", height: "32px", color: "var(--text-muted)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No environments yet. Add a machine to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {gwNodes.map((node) => {
              const role = ROLE_META[node.role] ?? ROLE_META.gateway;
              return (
                <div key={node.id} style={{ padding: "16px 20px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, backgroundColor: node.is_online ? "var(--positive)" : "var(--text-muted)", boxShadow: node.is_online ? "0 0 6px var(--positive)" : "none" }} />
                  <span style={{ fontSize: "20px", flexShrink: 0 }}>{OS_EMOJI[node.os ?? ""] ?? "🖥️"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{node.label}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", padding: "2px 7px", borderRadius: "4px", backgroundColor: "hsl(var(--primary) / 0.1)", color: role.color }}>{role.label}</span>
                      {node.is_online && node.active_agents > 0 && <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{node.active_agents} agents</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>{node.ip}{node.port ? `:${node.port}` : ""}</span>
                      {node.gateway_model && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{node.gateway_model}</span>}
                      <span style={{ fontSize: "11px", color: node.is_online ? "var(--positive)" : "var(--text-muted)" }}>
                        {node.is_online ? "● Online" : `Last seen ${timeSince(node.last_seen)}`}
                      </span>
                    </div>
                    {node.notes && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.notes}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {node.is_online && (
                      <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        <ExternalLink style={{ width: "12px", height: "12px" }} /> Live connect
                      </button>
                    )}
                    <button onClick={() => deleteNode(node.id)} style={{ padding: "6px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${deleting === node.id ? "var(--negative)" : "var(--border)"}`, backgroundColor: deleting === node.id ? "var(--negative-soft)" : "transparent", color: deleting === node.id ? "var(--negative)" : "var(--text-muted)", fontSize: "11px", cursor: "pointer" }}>
                      {deleting === node.id ? "Sure?" : <Trash2 style={{ width: "12px", height: "12px" }} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ OpenClaw Paired Nodes (gateway RPC — companion devices) ══ */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>OpenClaw Nodes</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Companion devices connected to the gateway (cameras, screens, remote execution)</p>
          </div>
          <button onClick={refresh} disabled={ocLoading} style={{ padding: "7px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
            <RefreshCw style={{ width: "14px", height: "14px" }} className={ocLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {!isConnected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "var(--warning-soft)", borderRadius: "var(--radius-md)" }}>
            <AlertCircle style={{ width: "14px", height: "14px", color: "var(--warning)", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--warning)" }}>Gateway not connected — start OpenClaw to see paired nodes</span>
          </div>
        ) : ocError ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "var(--negative-soft)", borderRadius: "var(--radius-md)" }}>
            <AlertCircle style={{ width: "14px", height: "14px", color: "var(--negative)", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--negative)" }}>{ocError}</span>
          </div>
        ) : (
          <>
            {ocLoading && ocNodes.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                <Loader2 style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} className="animate-spin" />
              </div>
            ) : ocNodes.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 0" }}>No companion nodes connected</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "8px", marginBottom: "16px" }}>
                {ocNodes.map((node) => (
                  <div key={node.id} className="group" style={{ padding: "14px 16px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Monitor style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} />
                        <div>
                          {editingNode === node.id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRename(node.id)}
                                style={{ padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "120px" }} autoFocus />
                              <button onClick={() => handleRename(node.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Check style={{ width: "12px", height: "12px", color: "var(--positive)" }} /></button>
                              <button onClick={() => setEditingNode(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X style={{ width: "12px", height: "12px", color: "var(--negative)" }} /></button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{node.displayName || node.id}</span>
                              <button onClick={() => { setEditingNode(node.id); setEditName(node.displayName || ""); }} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, padding: 0 }}>
                                <Edit2 style={{ width: "11px", height: "11px", color: "var(--text-muted)" }} />
                              </button>
                            </div>
                          )}
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{node.platform ?? "unknown"}{node.version ? ` v${node.version}` : ""}</p>
                        </div>
                      </div>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: !node.status || node.status === "connected" ? "var(--positive)" : "var(--text-muted)" }} />
                    </div>
                    {node.caps && node.caps.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "10px" }}>
                        {node.caps.map(cap => <span key={cap} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>{cap}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {devices.length > 0 && (
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Smartphone style={{ width: "12px", height: "12px" }} /> Paired Devices ({devices.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {devices.map(device => (
                    <div key={device.deviceId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{device.displayName || device.deviceId}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>{device.role}{device.platform ? ` · ${device.platform}` : ""}</p>
                      </div>
                      <button onClick={() => removeDevice(device.deviceId)} style={{ padding: "6px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "transparent", cursor: "pointer", color: "var(--negative)" }}>
                        <Trash2 style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showAdd && <AddNodeModal onClose={() => setShowAdd(false)} onAdded={fetchGwNodes} />}
    </div>
  );
}