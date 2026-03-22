// src/components/gateway/SessionReset/index.tsx
'use client';

import { useState } from "react";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawSessions } from "@/hooks/use-openclaw-sessions";
import { Loader2, Check, AlertCircle, RotateCcw } from "lucide-react";

export default function SessionReset() {
  const { rpc, isConnected } = useOpenClaw();
  const { sessions } = useOpenClawSessions();

  const [sessionKey, setSessionKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Only show the mission-control chat sessions — skip cron/telegram noise
  const chatSessions = sessions.filter(
    (s) =>
      s.key?.includes("openai-user:mission-control") ||
      s.key === "agent:main:main"
  );

  const handleReset = async () => {
    const key = sessionKey.trim();
    if (!key) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await rpc("sessions.reset", { key });
      setStatus("ok");
      setSessionKey("");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset session");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  if (!isConnected) return null;

  const isLoading = status === "loading";
  const isOk = status === "ok";
  const isError = status === "error";

  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <RotateCcw className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Reset Session
        </h2>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <select
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm outline-none appearance-none transition-all"
            style={{
              borderColor: "var(--border)",
              color: sessionKey ? "var(--text-primary)" : "var(--text-muted)",
              backgroundColor: "var(--card)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          >
            <option value="">— Select session —</option>
            {chatSessions.map((s) => (
              <option key={s.key} value={s.key} style={{ backgroundColor: "var(--card)" }}>
                {s.key}
              </option>
            ))}
          </select>

          <button
            onClick={handleReset}
            disabled={isLoading || !sessionKey}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0 disabled:opacity-40"
            style={{
              backgroundColor: isError ? "#ef444420" : isOk ? "#22c55e20" : "#f9731620",
              color: isError ? "#ef4444" : isOk ? "#22c55e" : "#f97316",
            }}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isOk ? (
              <Check className="w-3.5 h-3.5" />
            ) : isError ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : null}
            {isOk ? "Done" : isError ? "Error" : "Reset"}
          </button>
        </div>

        {isError && (
          <p className="text-xs" style={{ color: "#ef4444" }}>{errorMsg}</p>
        )}

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Clears a stuck or timed-out agent session without deleting history.
        </p>
      </div>
    </div>
  );
}