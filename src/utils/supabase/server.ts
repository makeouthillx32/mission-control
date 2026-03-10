// utils/supabase/server.ts
import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // no-op in edge environments
          }
        },
      },
    }
  );
}

export function createServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * ✅ Backwards-compatible alias
 * Some pages/components import { createClient } from "@/utils/supabase/server".
 * This keeps your existing API usage intact while making Vercel builds pass.
 */
export async function createClient(
  mode: "regular" | "service" = "regular"
): Promise<SupabaseClient> {
  return mode === "service" ? createServiceClient() : await createServerClient();
}