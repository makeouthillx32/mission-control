// src/components/DMRCard.tsx
"use client";

import { useEffect, useState } from "react";

interface DMREndpoint {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  is_primary: boolean;
  last_status: string | null;
  last_checked_at: string | null;
  model_count: number;
  models: string[];
}

export function DMRCard() {
  const [endpoints, setEndpoints] = useState<DMREndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const load = async () => {
    const res = await fetch("/api/dmr/endpoints");
    const data = await res.json();
    setEndpoints(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const probe = async (ep: DMREndpoint) => {
    setProbing(ep.id);
    await fetch("/api/dmr/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ep.id, base_url: ep.base_url }),
    });
    await load();
    setProbing(null);
  };

  const setPrimary = async (ep: DMREndpoint) => {
    await fetch("/api/dmr/endpoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ep.id, is_primary: true }),
    });
    await load();
  };

  const toggleActive = async (ep: DMREndpoint) => {
    await fetch("/api/dmr/endpoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ep.id, is_active: !ep.is_active }),
    });
    await load();
  };

  const remove = async (ep: DMREndpoint) => {
    if (!confirm(`Remove ${ep.name}?`)) return;
    await fetch("/api/dmr/endpoints", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ep.id }),
    });
    await load();
  };

  const addEndpoint = async () => {
    if (!newName || !newUrl) return;
    await fetch("/api/dmr/endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, base_url: newUrl }),
    });
    setNewName("");
    setNewUrl("");
    setAdding(false);
    await load();
  };

  const statusColor = (ep: DMREndpoint) => {
    if (!ep.last_status) return "bg-gray-400";
    return ep.last_status === "healthy" ? "bg-green-500" : "bg-red-500";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-card-foreground">Docker Model Runner</h3>
          <p className="text-sm text-muted-foreground">Manage DMR endpoints — add POWER, LOVE, any machine</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          + Add Endpoint
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 items-end p-3 rounded-lg bg-muted">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              className="w-full text-sm px-2 py-1.5 rounded border border-border bg-background"
              placeholder="LOVE"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div className="flex-[2] space-y-1">
            <label className="text-xs text-muted-foreground">Base URL</label>
            <input
              className="w-full text-sm px-2 py-1.5 rounded border border-border bg-background"
              placeholder="http://192.168.50.75:12434"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
            />
          </div>
          <button
            onClick={addEndpoint}
            className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground"
          >
            Save
          </button>
          <button
            onClick={() => setAdding(false)}
            className="px-3 py-1.5 text-sm rounded-lg bg-muted-foreground/20"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading endpoints...</p>
      ) : endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No endpoints configured.</p>
      ) : (
        <div className="space-y-2">
          {endpoints.map(ep => (
            <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(ep)}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ep.name}</span>
                  {ep.is_primary && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">primary</span>
                  )}
                  {!ep.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">disabled</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{ep.base_url}</p>
                {ep.last_status && (
                  <p className="text-xs text-muted-foreground">
                    {ep.model_count} model{ep.model_count !== 1 ? "s" : ""}
                    {ep.last_checked_at && ` · ${new Date(ep.last_checked_at).toLocaleTimeString()}`}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => probe(ep)}
                  disabled={probing === ep.id}
                  className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted"
                >
                  {probing === ep.id ? "..." : "Probe"}
                </button>
                {!ep.is_primary && (
                  <button
                    onClick={() => setPrimary(ep)}
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => toggleActive(ep)}
                  className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted"
                >
                  {ep.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => remove(ep)}
                  className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}