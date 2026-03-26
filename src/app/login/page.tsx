// src/app/login/page.tsx
"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * Detects whether we are running inside an iOS standalone PWA.
 * navigator.standalone is a non-standard Safari property.
 */
function isIOSStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.navigator as any).standalone;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        const from = searchParams.get("from") || "/";

        if (isIOSStandalone()) {
          // In iOS PWA standalone mode, router.push + router.refresh() causes
          // WebKit to break out of the PWA shell and open Safari.
          // Using location.href keeps the navigation inside the standalone context.
          window.location.href = from;
        } else {
          // Standard browser — safe to do a full navigation too,
          // but location.href is fine here as well (no refresh() needed).
          window.location.href = from;
        }
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Connection error. Check your network and retry.");
    }

    setLoading(false);
  };

  const inputStyle = {
    backgroundColor: "hsl(var(--input))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    outline: "none",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "hsl(var(--ring))";
    e.currentTarget.style.boxShadow = "0 0 0 2px hsl(var(--ring) / 0.2)";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "hsl(var(--border))";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div
      className="rounded-2xl p-8 w-full"
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "var(--shadow-xl)",
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-3xl">🦞</span>
        </div>
        <h1
          className="text-2xl font-bold tracking-tight mb-1"
          style={{
            fontFamily: "var(--font-heading)",
            color: "hsl(var(--foreground))",
          }}
        >
          Mission Control
        </h1>
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Sign in to access the dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
            style={inputStyle}
            placeholder="Email"
            autoComplete="email"
            autoFocus
            required
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
            style={inputStyle}
            placeholder="Password"
            autoComplete="current-password"
            required
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
            style={{
              backgroundColor: "hsl(var(--destructive) / 0.1)",
              color: "hsl(var(--destructive))",
              border: "1px solid hsl(var(--destructive) / 0.2)",
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-semibold py-3 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}