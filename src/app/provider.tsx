// src/app/provider.tsx

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
import { defaultThemeId, getThemeById, getAvailableThemeIds } from "@/themes";
import type { Theme } from "@/types/theme";
import { transitionTheme, smoothThemeToggle } from "@/utils/themeTransitions";

// ─── Theme Context ────────────────────────────────────────

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string, element?: HTMLElement) => Promise<void>;
  themeType: "light" | "dark";
  toggleTheme: (element?: HTMLElement) => Promise<void>;
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
  // ── Theme state ───────────────────────────────────────
  const [themeId, setThemeIdState] = useState<string>(defaultThemeId);

  // "light" as interim default — provider overwrites immediately on mount
  // from localStorage/cookie before first paint completes
  const [themeType, setThemeType] = useState<"light" | "dark">("light");
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

  // Wired to smoothThemeToggle (with element) or transitionTheme (no element)
  const toggleTheme = useCallback(async (element?: HTMLElement) => {
    const themeChangeCallback = () => {
      setThemeType((prev) => {
        const next = prev === "light" ? "dark" : "light";
        // Write to BOTH keys so old and new code can read it
        setCookie("theme", next, { path: "/", maxAge: 31536000 });
        localStorage.setItem("theme", next);
        return next;
      });
    };

    if (element) {
      await smoothThemeToggle(element, themeChangeCallback);
    } else {
      await transitionTheme(themeChangeCallback);
    }
  }, []);

  const setThemeId = useCallback(async (id: string, element?: HTMLElement) => {
    const themeChangeCallback = async () => {
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
    };

    if (element) {
      await smoothThemeToggle(element, themeChangeCallback);
    } else {
      await transitionTheme(themeChangeCallback);
    }
  }, []);

  // Load available themes on mount
  useEffect(() => {
    getAvailableThemeIds()
      .then(setAvailableThemes)
      .catch(() => setAvailableThemes([defaultThemeId]));
  }, []);

  // Hydrate saved preferences on mount
  // Reads "theme" key (not "themeType") to match what toggleTheme writes
  useEffect(() => {
    setMounted(true);

    const savedId = localStorage.getItem("themeId") || getCookie("themeId");
    if (savedId) {
      getThemeById(savedId).then((t) => {
        if (t) setThemeIdState(savedId);
      });
    }

    // Read "theme" key — consistent with what toggleTheme saves
    const savedType =
      localStorage.getItem("theme") ||
      getCookie("theme");

    if (savedType === "light" || savedType === "dark") {
      setThemeType(savedType);
    } else {
      // No saved preference — fall back to system
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

  // ── Auth state ────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────
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