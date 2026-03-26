// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rate limiter — keyed by IP
// Single-user app so this is just a brute-force guard, not a multi-tenant concern.
const ATTEMPTS: Map<string, { count: number; resetAt: number }> = new Map();
const MAX_ATTEMPTS = 10;       // 10 attempts before lockout
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minute lockout (down from 15)

function getIp(req: NextRequest): string {
  // Try forwarded headers first (set by reverse proxy / Cloudflare / nginx)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first && first !== "unknown") return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp !== "unknown") return realIp;

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Fallback — if we can't determine IP, use a shared key.
  // This means all unknown-origin requests share the same bucket,
  // which is fine for a single-user dashboard.
  return "shared";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = ATTEMPTS.get(ip);
  if (!entry || now > entry.resetAt) return { allowed: true };
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = ATTEMPTS.get(ip);
  if (!entry || now > entry.resetAt) {
    ATTEMPTS.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip: string) {
  ATTEMPTS.delete(ip);
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many failed attempts. Try again in ${rateCheck.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "Email and password are required." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    recordFailure(ip);
    console.error("[login] signInWithPassword failed:", error.message);
    return NextResponse.json(
      { success: false, error: "Invalid email or password." },
      { status: 401 }
    );
  }

  clearAttempts(ip);
  return response;
}