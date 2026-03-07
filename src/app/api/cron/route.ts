import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || "/root/.openclaw";
const CRON_JOBS_PATH = path.join(OPENCLAW_DIR, "cron", "jobs.json");

function readJobsFile(): { version: number; jobs: Record<string, unknown>[] } {
  try {
    const raw = readFileSync(CRON_JOBS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, jobs: [] };
  }
}

function writeJobsFile(data: { version: number; jobs: Record<string, unknown>[] }) {
  writeFileSync(CRON_JOBS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function formatDescription(job: Record<string, unknown>): string {
  const payload = job.payload as Record<string, unknown>;
  if (!payload) return "";
  if (payload.kind === "agentTurn") {
    const msg = (payload.message as string) || "";
    return msg.length > 120 ? msg.substring(0, 120) + "..." : msg;
  }
  if (payload.kind === "systemEvent") {
    const text = (payload.text as string) || "";
    return text.length > 120 ? text.substring(0, 120) + "..." : text;
  }
  return "";
}

function formatSchedule(schedule: Record<string, unknown>): string {
  if (!schedule) return "Unknown";
  switch (schedule.kind) {
    case "cron":
      return `${schedule.expr}${schedule.tz ? ` (${schedule.tz})` : ""}`;
    case "every": {
      const ms = schedule.everyMs as number;
      if (ms >= 3600000) return `Every ${ms / 3600000}h`;
      if (ms >= 60000) return `Every ${ms / 60000}m`;
      return `Every ${ms / 1000}s`;
    }
    case "at":
      return `Once at ${schedule.at}`;
    default:
      return JSON.stringify(schedule);
  }
}

// GET: List all cron jobs from jobs.json
export async function GET() {
  try {
    const data = readJobsFile();
    const jobs = (data.jobs || []).map((job: Record<string, unknown>) => ({
      id: job.id,
      agentId: job.agentId || "main",
      name: job.name || "Unnamed",
      enabled: job.enabled ?? true,
      createdAtMs: job.createdAtMs,
      updatedAtMs: job.updatedAtMs,
      schedule: job.schedule,
      sessionTarget: job.sessionTarget,
      payload: job.payload,
      delivery: job.delivery,
      state: job.state,
      description: formatDescription(job),
      scheduleDisplay: formatSchedule(job.schedule as Record<string, unknown>),
      timezone: (job.schedule as Record<string, string>)?.tz || "UTC",
      nextRun: (job.state as Record<string, unknown>)?.nextRunAtMs
        ? new Date((job.state as Record<string, number>).nextRunAtMs).toISOString()
        : null,
      lastRun: (job.state as Record<string, unknown>)?.lastRunAtMs
        ? new Date((job.state as Record<string, number>).lastRunAtMs).toISOString()
        : null,
    }));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching cron jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron jobs" },
      { status: 500 }
    );
  }
}

// PUT: Toggle enable/disable a cron job by editing jobs.json directly
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const data = readJobsFile();
    const job = data.jobs.find((j) => j.id === id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    job.enabled = enabled;
    job.updatedAtMs = Date.now();
    writeJobsFile(data);

    return NextResponse.json({ success: true, id, enabled });
  } catch (error) {
    console.error("Error updating cron job:", error);
    return NextResponse.json(
      { error: "Failed to update cron job" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a cron job from jobs.json directly
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const data = readJobsFile();
    const before = data.jobs.length;
    data.jobs = data.jobs.filter((j) => j.id !== id);

    if (data.jobs.length === before) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    writeJobsFile(data);
    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Error deleting cron job:", error);
    return NextResponse.json(
      { error: "Failed to delete cron job" },
      { status: 500 }
    );
  }
}