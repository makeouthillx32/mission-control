// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";
import { middleware as supabaseMiddleware } from "@/utils/supabase/middleware";

const PUBLIC_ROUTES = new Set(["/login"]);
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/health"];

async function getSessionVersion(): Promise<string> {
  const secret = process.env.AUTH_SECRET || "";
  const encoded = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("mc_auth")?.value;
  if (!token) return false;
  const version = await getSessionVersion();
  return token.startsWith(`mc-${version}-`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!(await isAuthenticated(request))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};