// src/app/api/dmr/probe/route.ts
// Probes a DMR endpoint URL and returns its models

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { id, base_url } = await req.json();

  const url = `${base_url}/engines/v1/models`;

  let reachable = false;
  let models: string[] = [];
  let error = null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      models = (json?.data ?? []).map((m: any) => m.id);
      reachable = true;
    } else {
      error = `HTTP ${res.status}`;
    }
  } catch (e: any) {
    error = e.message;
  }

  // Update status in DB if id provided
  if (id) {
    await supabase
      .from("dmr_endpoints")
      .update({
        last_status: reachable ? "healthy" : "unreachable",
        last_checked_at: new Date().toISOString(),
        model_count: models.length,
        models: models,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return NextResponse.json({ reachable, models, error });
}