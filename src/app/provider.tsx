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
import { OpenClawProvider } from "@/contexts/OpenClawContext";

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

// ─── Supabase browser client (singleton) ─────────────────

// Created once outside the component so onAuthStateChange isn't re-subscribed
// on every render, and so the same instance handles both the initial session
// check and any subsequent SIGNED_IN / SIGNED_OUT events.
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Providers ────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  // ── Theme state ───────────────────────────────────────
  const [themeId, setThemeIdState] = useState<string>(defaultThemeId);
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

  const toggleTheme = useCallback(async (element?: HTMLElement) => {
    const themeChangeCallback = () => {
      setThemeType((prev) => {
        const next = prev === "light" ? "dark" : "light";
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

  useEffect(() => {
    getAvailableThemeIds()
      .then(setAvailableThemes)
      .catch(() => setAvailableThemes([defaultThemeId]));
  }, []);

  useEffect(() => {
    setMounted(true);

    const savedId = localStorage.getItem("themeId") || getCookie("themeId");
    if (savedId) {
      getThemeById(savedId).then((t) => {
        if (t) setThemeIdState(savedId);
      });
    }

    const savedType =
      localStorage.getItem("theme") ||
      getCookie("theme");

    if (savedType === "light" || savedType === "dark") {
      setThemeType(savedType);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeType(systemDark ? "dark" : "light");
    }
  }, []);

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
    // getUser() validates against the server (reads the actual auth cookie)
    // rather than trusting whatever is in localStorage, which means it correctly
    // reflects the session set by signInWithPassword on the server side.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Session may not be directly available from getUser(), so also
        // call getSession() to hydrate the session object for consumers.
        supabase.auth.getSession().then(({ data: sessionData }) => {
          setSession(sessionData.session);
          setLoading(false);
        });
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    // onAuthStateChange fires for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    // This keeps the client in sync after login/logout without a page reload.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Render ────────────────────────────────────────────
  return (
    <ThemeContext.Provider
      value={{ themeId, setThemeId, themeType, toggleTheme, getTheme, availableThemes }}
    >
      <AuthContext.Provider value={{ session, loading }}>
        <OpenClawProvider>
          {children}
        </OpenClawProvider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}