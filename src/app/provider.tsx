"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

// ─── Theme Context ────────────────────────────────────────

interface ThemeContextType {
  theme: "dark"; // Mission Control is always dark
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark" });

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Auth Context ─────────────────────────────────────────

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Providers ────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      <AuthContext.Provider value={{ session, loading }}>
        {children}
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}