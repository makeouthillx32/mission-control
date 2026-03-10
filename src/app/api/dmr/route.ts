// src/app/api/dmr/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();

  const { data: endpoint, error } = await supabase
    .from("dmr_endpoints")
    .select("*")
    .eq("is_primary", true)
    .eq("is_active", true)
    .single();

  if (error || !endpoint) {
    return NextResponse.json({
      reachable: false,
      models: [],
      modelCount: 0,
      error: "No primary DMR endpoint configured",
      lastChecked: new Date().toISOString(),
    });
  }

  const url = `${endpoint.base_url}/engines/v1/models`;
  let reachable = false;
  let models: string[] = [];
  let probeError = null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      models = (json?.data ?? []).map((m: any) => m.id);
      reachable = true;
    } else {
      probeError = `HTTP ${res.status}`;
    }
  } catch (e: any) {
    probeError = e.message;
  }

  await supabase
    .from("dmr_endpoints")
    .update({
      last_status: reachable ? "healthy" : "unreachable",
      last_checked_at: new Date().toISOString(),
      model_count: models.length,
      models,
      updated_at: new Date().toISOString(),
    })
    .eq("id", endpoint.id);

  return NextResponse.json({
    reachable,
    models,
    modelCount: models.length,
    lastChecked: new Date().toISOString(),
    dmrBaseUrl: endpoint.base_url,
    engineSuffix: "/engines/v1",
    error: probeError,
    patched: false,
    primaryModel: models[0] ?? null,
    fromCache: false,
    endpointName: endpoint.name,
  });
}

export async function POST() {
  const supabase = getSupabase();

  const { data: endpoints } = await supabase
    .from("dmr_endpoints")
    .select("*")
    .eq("is_active", true);

  if (!endpoints?.length) {
    return NextResponse.json({ ok: false, error: "No active endpoints" });
  }

  const results = await Promise.all(
    endpoints.map(async (ep) => {
      const url = `${ep.base_url}/engines/v1/models`;
      let reachable = false;
      let models: string[] = [];

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json = await res.json();
          models = (json?.data ?? []).map((m: any) => m.id);
          reachable = true;
        }
      } catch {}

      await supabase
        .from("dmr_endpoints")
        .update({
          last_status: reachable ? "healthy" : "unreachable",
          last_checked_at: new Date().toISOString(),
          model_count: models.length,
          models,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ep.id);

      return { name: ep.name, reachable, modelCount: models.length };
    })
  );

  return NextResponse.json({ ok: true, results });
}