// src/app/api/nodes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const { data, error } = await sb()
    .from("gateway_nodes_with_status")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.label?.trim() || !body.ip?.trim())
    return NextResponse.json({ error: "label and ip are required" }, { status: 400 });

  const { data, error } = await sb()
    .from("gateway_nodes")
    .insert({
      hostname:    body.hostname?.trim() || body.label.trim().toUpperCase().replace(/\s+/g, "-"),
      label:       body.label.trim(),
      ip:          body.ip.trim(),
      port:        parseInt(body.port) || 18789,
      role:        body.role        ?? "gateway",
      os:          body.os          ?? "linux",
      arch:        body.arch        ?? "x64",
      device_type: body.device_type ?? "server",
      notes:       body.notes?.trim() ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["label", "hostname", "ip", "port", "role", "os", "arch", "device_type", "notes"];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));

  const { data, error } = await sb()
    .from("gateway_nodes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await sb().from("gateway_nodes").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}