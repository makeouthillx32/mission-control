"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { setCookie, getCookie } from "@/lib/cookieUtils";
import { defaultThemeId, themeMap } from "@/themes";
import type { Theme } from "@/types/theme";

// ─── Theme Context ────────────────────────────────────────

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  themeType: "light" | "dark";
  toggleTheme: () => void;
  getTheme: () => Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within Providers");
  return ctx;
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
  // ── Theme ──────────────────────────────────────────────
  const [themeId, setThemeIdState] = useState<string>(defaultThemeId);
  const [themeType, setThemeType] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  const getTheme = useCallback((): Theme => {
    return themeMap[themeId] || themeMap[defaultThemeId];
  }, [themeId]);

  const setThemeId = useCallback((id: string) => {
    if (themeMap[id]) {
      setThemeIdState(id);
      setCookie("themeId", id, { path: "/", maxAge: 31536000 });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeType((prev) => {
      const next = prev === "light" ? "dark" : "light";
      setCookie("themeType", next, { path: "/", maxAge: 31536000 });
      return next;
    });
  }, []);

  // Hydrate saved preferences on mount
  useEffect(() => {
    setMounted(true);

    const savedId = getCookie("themeId") || localStorage.getItem("themeId");
    if (savedId && themeMap[savedId]) setThemeIdState(savedId);

    const savedType = getCookie("themeType") || localStorage.getItem("themeType");
    if (savedType === "light" || savedType === "dark") {
      setThemeType(savedType);
    } else {
      // Default to dark for Mission Control; fall back to system pref
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeType(systemPrefersDark ? "dark" : "light");
    }
  }, []);

  // Apply CSS variables + class to <html> whenever theme or mode changes
  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    const theme = getTheme();
    const variables = themeType === "dark" ? theme.dark : theme.light;

    for (const [key, value] of Object.entries(variables)) {
      html.style.setProperty(key, value);
    }

    html.classList.remove("light", "dark");
    html.classList.add(themeType);

    localStorage.setItem("themeId", themeId);
    localStorage.setItem("themeType", themeType);
  }, [themeId, themeType, mounted, getTheme]);

  // ── Auth ───────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────
  return (
    <ThemeContext.Provider
      value={{ themeId, setThemeId, themeType, toggleTheme, getTheme }}
    >
      <AuthContext.Provider value={{ session, loading }}>
        {children}
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}