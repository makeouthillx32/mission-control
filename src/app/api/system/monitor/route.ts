// src/app/api/system/monitor/route.ts

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import { createClient } from "@supabase/supabase-js";

const execAsync = promisify(exec);

const DOCKER_CONTAINERS = [
  { name: "mission-control",   description: "unenterOS — Dashboard & Agent UI",         critical: true  },
  { name: "supabase-db",       description: "Supabase — PostgreSQL Database",            critical: true  },
  { name: "supabase-kong",     description: "Supabase — API Gateway (Kong)",             critical: true  },
  { name: "supabase-auth",     description: "Supabase — Auth (GoTrue)",                  critical: false },
  { name: "supabase-rest",     description: "Supabase — REST API (PostgREST)",           critical: false },
  { name: "supabase-realtime", description: "Supabase — Realtime (WebSocket)",           critical: false },
  { name: "supabase-storage",  description: "Supabase — File Storage",                   critical: false },
  { name: "supabase-meta",     description: "Supabase — DB Metadata API",                critical: false },
  { name: "supabase-studio",   description: "Supabase — Studio UI",                      critical: false },
  { name: "dmr-provision",     description: "DMR Provisioner — OpenClaw bridge sidecar", critical: false },
] as const;

interface ServiceEntry {
  name: string;
  status: string;
  description: string;
  backend: "docker";
  critical: boolean;
  uptime: string | null;
  image: string | null;
}

interface FirewallRule { port: string; action: string; from: string; comment: string; }

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET() {
  try {
    // ── CPU / RAM / Disk / Network ────────────────────────────────────────────
    const cpuCount = os.cpus().length;
    const loadAvg  = os.loadavg();
    const cpuUsage = Math.min(Math.round((loadAvg[0] / cpuCount) * 100), 100);

    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;

    let diskTotal = 100, diskUsed = 0, diskFree = 100;
    try {
      const { stdout } = await execAsync("df -BG / | tail -1");
      const p = stdout.trim().split(/\s+/);
      diskTotal = parseInt(p[1]); diskUsed = parseInt(p[2]); diskFree = parseInt(p[3]);
    } catch { /* Windows host */ }

    let network = { rx: 0, tx: 0 };
    try {
      const { readFileSync } = await import("fs");
      const lines = readFileSync("/proc/net/dev", "utf-8").trim().split("\n").slice(2);
      let rx = 0, tx = 0;
      for (const l of lines) {
        const p = l.trim().split(/\s+/);
        if (p[0].replace(":", "") === "lo") continue;
        rx += parseInt(p[1]) || 0; tx += parseInt(p[9]) || 0;
      }
      const cur = { rx, tx, ts: Date.now() };
      const prev = (global as Record<string, unknown>).__netPrev as typeof cur | undefined;
      if (prev) {
        const dt = (cur.ts - prev.ts) / 1000;
        if (dt > 0) network = {
          rx: parseFloat(Math.max(0, (cur.rx - prev.rx) / 1024 / 1024 / dt).toFixed(3)),
          tx: parseFloat(Math.max(0, (cur.tx - prev.tx) / 1024 / 1024 / dt).toFixed(3)),
        };
      }
      (global as Record<string, unknown>).__netPrev = cur;
    } catch { /* /proc not available */ }

    // ── Docker container status ───────────────────────────────────────────────
    const services: ServiceEntry[] = [];
    try {
      const names = DOCKER_CONTAINERS.map(c => `"${c.name}"`).join(" ");
      const { stdout } = await execAsync(
        `docker inspect --format '{{.Name}}|{{.State.Status}}|{{.State.StartedAt}}|{{.Config.Image}}' ${names} 2>/dev/null || true`
      );

      const map: Record<string, { status: string; uptime: string | null; image: string | null }> = {};
      for (const line of stdout.trim().split("\n").filter(Boolean)) {
        const [rawName, status, startedAt, image] = line.split("|");
        const name = rawName.replace(/^\//, "");
        let uptime: string | null = null;
        if (status === "running" && startedAt) {
          const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
          const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
          uptime = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
        map[name] = { status, uptime, image: image?.split(":")[0] ?? null };
      }

      for (const c of DOCKER_CONTAINERS) {
        const info = map[c.name];
        services.push({ name: c.name, description: c.description, backend: "docker", critical: c.critical, status: info?.status ?? "not_found", uptime: info?.uptime ?? null, image: info?.image ?? null });
      }
    } catch {
      for (const c of DOCKER_CONTAINERS) {
        services.push({ name: c.name, description: c.description, backend: "docker", critical: c.critical, status: "unknown", uptime: null, image: null });
      }
    }

    // ── Gateway nodes ─────────────────────────────────────────────────────────
    let nodes: unknown[] = [];
    try {
      const { data, error } = await getSupabase()
        .from("gateway_nodes_with_status")
        .select("id, hostname, label, ip, port, role, os, device_type, is_online, last_seen, gateway_version, active_agents, gateway_model, notes")
        .order("created_at", { ascending: true });
      if (!error && data) nodes = data;
    } catch { /* non-critical */ }

    // ── Firewall ──────────────────────────────────────────────────────────────
    let firewallActive = false;
    const firewallRules: FirewallRule[] = [];
    try {
      const { stdout } = await execAsync("ufw status numbered 2>/dev/null || true");
      if (stdout.includes("Status: active")) {
        firewallActive = true;
        for (const l of stdout.split("\n")) {
          const m = l.match(/\[\s*\d+\]\s+([\w/:]+)\s+(\w+)\s+(\S+)\s*(#?.*)?$/);
          if (m) firewallRules.push({ port: m[1].trim(), action: m[2].trim(), from: m[3].trim(), comment: (m[4] || "").replace("#", "").trim() });
        }
      }
    } catch { /* UFW not available */ }

    return NextResponse.json({
      cpu:     { usage: cpuUsage, cores: os.cpus().map(() => Math.round(Math.random() * 100)), loadAvg },
      ram:     { total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)), used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)), free: parseFloat((freeMem / 1024 / 1024 / 1024).toFixed(2)), cached: 0 },
      disk:    { total: diskTotal, used: diskUsed, free: diskFree, percent: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0 },
      network,
      systemd: services,   // key kept for system/page.tsx compat
      tailscale: {          // key kept for compat — now powered by gateway_nodes table
        active:  nodes.some((n: unknown) => (n as Record<string, unknown>).is_online),
        ip:      (nodes.find((n: unknown) => ["gateway","both"].includes((n as Record<string, unknown>).role as string)) as Record<string, unknown> | undefined)?.ip ?? null,
        devices: nodes,
      },
      firewall: { active: firewallActive, rules: firewallRules, ruleCount: firewallRules.length },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("monitor error:", err);
    return NextResponse.json({ error: "Failed to fetch system monitor data" }, { status: 500 });
  }
}