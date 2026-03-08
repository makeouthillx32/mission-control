// src/app/api/dmr/endpoints/route.ts
// CRUD for DMR endpoints — stored in Supabase, no env vars needed

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list all endpoints + probe each one live
export async function GET() {
  const { data, error } = await supabase
    .from("dmr_endpoints")
    .select("*")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — add new endpoint
export async function POST(req: Request) {
  const body = await req.json();
  const { name, base_url, api_key = "local-dmr", is_primary = false } = body;

  if (!name || !base_url) {
    return NextResponse.json({ error: "name and base_url required" }, { status: 400 });
  }

  // If setting as primary, clear existing primary first
  if (is_primary) {
    await supabase
      .from("dmr_endpoints")
      .update({ is_primary: false })
      .eq("is_primary", true);
  }

  const { data, error } = await supabase
    .from("dmr_endpoints")
    .insert({ name, base_url, api_key, is_primary })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — update endpoint (toggle active, set primary, update URL)
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // If setting as primary, clear existing primary first
  if (updates.is_primary) {
    await supabase
      .from("dmr_endpoints")
      .update({ is_primary: false })
      .eq("is_primary", true);
  }

  const { data, error } = await supabase
    .from("dmr_endpoints")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove endpoint
export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("dmr_endpoints")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}