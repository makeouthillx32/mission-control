"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        const from = searchParams.get("from") || "/";
        router.push(from);
        router.refresh();
      } else {
        setError("Incorrect password. Try again.");
      }
    } catch {
      setError("Connection error. Check your network and retry.");
    }

    setLoading(false);
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
        <p
          className="text-sm"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Enter your password to access the dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: "hsl(var(--input))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
              outline: "none",
            }}
            placeholder="Password"
            autoFocus
            required
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--ring))";
              e.currentTarget.style.boxShadow = "0 0 0 2px hsl(var(--ring) / 0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
              e.currentTarget.style.boxShadow = "none";
            }}
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
            cursor: loading ? "wait" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Footer */}
      <p
        className="text-center text-xs mt-6"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        OpenClaw Agent Infrastructure
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div
              className="rounded-2xl p-8 animate-pulse"
              style={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="h-6 rounded mb-4 w-32 mx-auto" style={{ backgroundColor: "hsl(var(--muted))" }} />
              <div className="h-11 rounded mb-3" style={{ backgroundColor: "hsl(var(--muted))" }} />
              <div className="h-11 rounded" style={{ backgroundColor: "hsl(var(--muted))" }} />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}