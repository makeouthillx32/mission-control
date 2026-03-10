"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { setCookie, getCookie } from "@/lib/cookieUtils";
import { defaultThemeId, getThemeById, getAvailableThemeIds } from "@/themes";
import type { Theme } from "@/types/theme";

// ─── Theme Context ────────────────────────────────────────

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => Promise<void>;
  themeType: "light" | "dark";
  toggleTheme: () => void;
  getTheme: (id?: string) => Promise<Theme | null>;
  availableThemes: string[];
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
  // ── Theme state ────────────────────────────────────────
  const [themeId, setThemeIdState] = useState<string>(defaultThemeId);
  const [themeType, setThemeType] = useState<"light" | "dark">("dark");
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const getTheme = useCallback(async (id?: string): Promise<Theme | null> => {
    const targetId = id || themeId;
    try {
      const theme = await getThemeById(targetId);
      if (!theme) return await getThemeById(defaultThemeId);
      return theme;
    } catch {
      return await getThemeById(defaultThemeId);
    }
  }, [themeId]);

  const setThemeId = useCallback(async (id: string) => {
    try {
      const theme = await getThemeById(id);
      if (theme) {
        setThemeIdState(id);
        localStorage.setItem("themeId", id);
        setCookie("themeId", id, { path: "/", maxAge: 31536000 });
      }
    } catch (e) {
      console.error("Error setting theme:", e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeType((prev) => {
      const next = prev === "light" ? "dark" : "light";
      setCookie("themeType", next, { path: "/", maxAge: 31536000 });
      localStorage.setItem("themeType", next);
      return next;
    });
  }, []);

  // Load available themes from DB on mount
  useEffect(() => {
    getAvailableThemeIds()
      .then(setAvailableThemes)
      .catch(() => setAvailableThemes([defaultThemeId]));
  }, []);

  // Hydrate saved preferences on mount
  useEffect(() => {
    setMounted(true);

    const savedId = localStorage.getItem("themeId") || getCookie("themeId");
    if (savedId) {
      getThemeById(savedId).then((t) => {
        if (t) setThemeIdState(savedId);
      });
    }

    const savedType = localStorage.getItem("themeType") || getCookie("themeType");
    if (savedType === "light" || savedType === "dark") {
      setThemeType(savedType);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeType(systemDark ? "dark" : "light");
    }
  }, []);

  // Apply CSS variables + class to <html> on theme or mode change
  useEffect(() => {
    if (!mounted || availableThemes.length === 0) return;

    getTheme().then((theme) => {
      if (!theme) return;
      const html = document.documentElement;
      const variables = themeType === "dark" ? theme.dark : theme.light;

      for (const [key, value] of Object.entries(variables)) {
        html.style.setProperty(key, value);
      }

      html.classList.remove("light", "dark");
      html.classList.add(themeType);
    });
  }, [themeId, themeType, mounted, availableThemes, getTheme]);

  // ── Auth state ─────────────────────────────────────────
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
      value={{ themeId, setThemeId, themeType, toggleTheme, getTheme, availableThemes }}
    >
      <AuthContext.Provider value={{ session, loading }}>
        {children}
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}