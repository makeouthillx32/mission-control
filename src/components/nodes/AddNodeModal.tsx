// src/components/nodes/AddNodeModal.tsx
"use client";

import { useState } from "react";
import { X, Zap, Cpu, Server, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { ROLE_META, OS_OPTIONS, DEVICE_TYPE_OPTIONS } from "@/lib/nodes";
import type { NodeRole } from "@/types/nodes";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

interface NodeForm {
  label:       string;
  ip:          string;
  port:        string;
  role:        NodeRole;
  os:          string;
  device_type: string;
  notes:       string;
}

const ROLE_ICONS: Record<NodeRole, React.ElementType> = {
  gateway: Zap,
  node:    Cpu,
  both:    Server,
};

export function AddNodeModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState<NodeForm>({
    label: "", ip: "", port: "18789",
    role: "gateway", os: "linux", device_type: "server", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const set = (k: keyof NodeForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.label.trim() || !form.ip.trim()) {
      setErr("Name and address are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to add node");
      }
      onAdded();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    backgroundColor: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    letterSpacing: "1px", color: "var(--text-muted)",
    textTransform: "uppercase", marginBottom: "6px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000 }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px", margin: "16px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Add Environment
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Connect a machine running OpenClaw or Docker
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Role picker */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Role</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {(["gateway", "node", "both"] as NodeRole[]).map((v) => {
              const Icon = ROLE_ICONS[v];
              const meta = ROLE_META[v];
              const active = form.role === v;
              return (
                <button key={v} onClick={() => set("role", v)} style={{
                  padding: "12px 8px", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "center",
                  border: `1px solid ${active ? "hsl(var(--primary))" : "var(--border)"}`,
                  backgroundColor: active ? "hsl(var(--primary) / 0.1)" : "var(--surface-elevated)",
                  transition: "all 150ms",
                }}>
                  <Icon style={{ width: "16px", height: "16px", color: active ? "hsl(var(--primary))" : "var(--text-muted)", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: active ? "hsl(var(--primary))" : "var(--text-primary)" }}>{meta.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{meta.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>Name <span style={{ color: "var(--negative)" }}>*</span></label>
          <input placeholder="e.g. POWER, cloud-vps-01" value={form.label} onChange={e => set("label", e.target.value)} style={inputStyle} />
        </div>

        {/* Address + Port */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Address <span style={{ color: "var(--negative)" }}>*</span></label>
            <input placeholder="192.168.1.10 or hostname" value={form.ip} onChange={e => set("ip", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Port</label>
            <input placeholder="18789" value={form.port} onChange={e => set("port", e.target.value)} style={{ ...inputStyle, width: "80px" }} />
          </div>
        </div>

        {/* OS + Type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>OS</label>
            <select value={form.os} onChange={e => set("os", e.target.value)} style={inputStyle}>
              {OS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.device_type} onChange={e => set("device_type", e.target.value)} style={inputStyle}>
              {DEVICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Notes</label>
          <input placeholder="Optional — hardware specs, purpose, etc." value={form.notes} onChange={e => set("notes", e.target.value)} style={inputStyle} />
        </div>

        {err && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", backgroundColor: "var(--negative-soft)", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
            <AlertCircle style={{ width: "14px", height: "14px", color: "var(--negative)", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--negative)" }}>{err}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving} style={{ padding: "9px 20px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
              : <CheckCircle2 style={{ width: "14px", height: "14px" }} />}
            {saving ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}