// src/app/api/system/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Allowlist — only containers that exist on POWER.
// Extend as you add containers to your docker-compose stack.
const ALLOWED_DOCKER = [
  "mission-control",
  "supabase-kong", "supabase-auth", "supabase-rest",
  "supabase-realtime", "supabase-db", "supabase-studio",
  "supabase-storage", "supabase-imgproxy", "supabase-meta",
  "supabase-edge-functions", "dmr-provision",
];

const ALLOWED_SYSTEMD = ["mission-control", "openclaw-gateway"];

async function dockerAction(name: string, action: string): Promise<string> {
  if (!ALLOWED_DOCKER.includes(name))
    throw new Error(`Container "${name}" not in allowlist`);
  if (!["restart", "stop", "start", "logs"].includes(action))
    throw new Error(`Invalid action "${action}"`);
  if (action === "logs") {
    const { stdout } = await execAsync(`docker logs --tail 150 "${name}" 2>&1`);
    return stdout || "No log output";
  }
  const { stdout } = await execAsync(`docker ${action} "${name}" 2>&1`);
  return stdout || `${action} executed`;
}

async function systemdAction(name: string, action: string): Promise<string> {
  if (!ALLOWED_SYSTEMD.includes(name))
    throw new Error(`Service "${name}" not in allowlist`);
  if (!["restart", "stop", "start", "logs"].includes(action))
    throw new Error(`Invalid action "${action}"`);
  if (action === "logs") {
    const { stdout } = await execAsync(`journalctl -u "${name}" -n 100 --no-pager 2>&1`);
    return stdout;
  }
  const { stdout } = await execAsync(`systemctl ${action} "${name}" 2>&1`);
  return stdout || `${action} executed`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, backend, action } = await req.json();
    if (!name || !action)
      return NextResponse.json({ error: "name and action required" }, { status: 400 });

    const output = backend === "docker"
      ? await dockerAction(name, action)
      : backend === "systemd"
      ? await systemdAction(name, action)
      : (() => { throw new Error(`Unknown backend "${backend}"`); })();

    return NextResponse.json({ ok: true, output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Action failed" }, { status: 500 });
  }
}