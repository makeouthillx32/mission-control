// src/app/api/dmr/endpoints/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — list all endpoints
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dmr_endpoints")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new endpoint
export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = await req.json();

  const { data, error } = await supabase
    .from("dmr_endpoints")
    .insert({
      name: body.name,
      base_url: body.base_url,
      api_key: body.api_key ?? "local-dmr",
      is_active: body.is_active ?? true,
      is_primary: body.is_primary ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH — update an endpoint (toggle active, set primary, rename, etc)
export async function PATCH(req: Request) {
  const supabase = getSupabase();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // If setting this endpoint as primary, clear all others first
  if (updates.is_primary === true) {
    await supabase
      .from("dmr_endpoints")
      .update({ is_primary: false })
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("dmr_endpoints")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE — remove an endpoint
export async function DELETE(req: Request) {
  const supabase = getSupabase();
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("dmr_endpoints")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}