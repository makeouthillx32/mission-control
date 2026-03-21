"use client";

// GatewayControls.tsx
// Three gateway actions from Mission Control:
//   1. Switch active model (config.set agents.defaults.model.primary)
//   2. Reset stuck session (sessions.reset)
//   3. Set timeout (config.set agents.defaults.timeoutSeconds)
//
// Drop into agents page or any dashboard card.

import { useState, useEffect } from "react";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawModels } from "@/hooks/use-openclaw-models";
import { useOpenClawSessions } from "@/hooks/use-openclaw-sessions";
import { ModelSelector } from "@/components/ModelSelector";
import { Loader2, Check, AlertCircle, Settings2 } from "lucide-react";

type Status = "idle" | "loading" | "ok" | "error";

function useAction() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setStatus("loading");
    setMessage("");
    try {
      await fn();
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return { status, message, run };
}

export function GatewayControls() {
  const { rpc, isConnected } = useOpenClaw();
  const { models, loading: modelsLoading } = useOpenClawModels();
  const { sessions } = useOpenClawSessions();

  // ── 1. Switch model ──────────────────────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState("");
  const [currentPrimary, setCurrentPrimary] = useState<string | null>(null);
  const modelAction = useAction();

  // Load current primary model from config
  useEffect(() => {
    if (!isConnected) return;
    rpc("config.get", { key: "agents.defaults.model.primary" } as any)
      .then((res: any) => {
        const val = res?.value ?? res;
        if (typeof val === "string") setCurrentPrimary(val);
      })
      .catch(() => {});
  }, [isConnected, rpc]);

  const switchModel = () =>
    modelAction.run(async () => {
      if (!selectedModel) throw new Error("Select a model first");
      await rpc("config.set" as any, {
        key: "agents.defaults.model.primary",
        value: selectedModel,
      });
      setCurrentPrimary(selectedModel);
      setSelectedModel("");
    });

  // ── 2. Reset session ─────────────────────────────────────────────────────
  const [sessionKey, setSessionKey] = useState("");
  const sessionAction = useAction();

  // Build session options — filter to agent main sessions only
  const agentSessions = sessions.filter(
    (s) => s.key?.startsWith("agent:") && !s.key?.includes(":run:")
  );

  const resetSession = () =>
    sessionAction.run(async () => {
      const key = sessionKey.trim();
      if (!key) throw new Error("Select or enter a session key");
      await rpc("sessions.reset", { key });
      setSessionKey("");
    });

  // ── 3. Timeout ───────────────────────────────────────────────────────────
  const [timeout, setTimeout_] = useState("300");
  const [currentTimeout, setCurrentTimeout] = useState<number | null>(null);
  const timeoutAction = useAction();

  useEffect(() => {
    if (!isConnected) return;
    rpc("config.get", { key: "agents.defaults.timeoutSeconds" } as any)
      .then((res: any) => {
        const val = res?.value ?? res;
        if (typeof val === "number") {
          setCurrentTimeout(val);
          setTimeout_(String(val));
        }
      })
      .catch(() => {});
  }, [isConnected, rpc]);

  const saveTimeout = () =>
    timeoutAction.run(async () => {
      const val = parseInt(timeout);
      if (isNaN(val) || val < 30) throw new Error("Must be at least 30 seconds");
      await rpc("config.set" as any, {
        key: "agents.defaults.timeoutSeconds",
        value: val,
      });
      setCurrentTimeout(val);
    });

  if (!isConnected) return null;

  return (
    <div
      className="rounded-xl mb-6"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Settings2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Gateway Controls
        </h2>
      </div>

      <div className="p-5 space-y-5">

        {/* ── 1. Switch model ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Primary Model
            </label>
            {currentPrimary && (
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                current: {currentPrimary.split("/").pop()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                placeholder="— Select to switch —"
                disabled={modelAction.status === "loading"}
              />
            </div>
            <ActionButton
              onClick={switchModel}
              status={modelAction.status}
              label="Switch"
              disabled={!selectedModel}
            />
          </div>
          {modelAction.status === "error" && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{modelAction.message}</p>
          )}
        </div>

        {/* ── 2. Reset session ────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Reset Stuck Session
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              {agentSessions.length > 0 ? (
                <select
                  value={sessionKey}
                  onChange={(e) => setSessionKey(e.target.value)}
                  disabled={sessionAction.status === "loading"}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm outline-none appearance-none transition-all"
                  style={{
                    borderColor: "var(--border)",
                    color: sessionKey ? "var(--text-primary)" : "var(--text-muted)",
                    backgroundColor: "var(--card)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                >
                  <option value="">— Select session —</option>
                  {agentSessions.map((s) => (
                    <option key={s.key} value={s.key} style={{ backgroundColor: "var(--card)" }}>
                      {s.key}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={sessionKey}
                  onChange={(e) => setSessionKey(e.target.value)}
                  placeholder="agent:main:openai-user:mission-control-..."
                  disabled={sessionAction.status === "loading"}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs font-mono outline-none transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              )}
            </div>
            <ActionButton
              onClick={resetSession}
              status={sessionAction.status}
              label="Reset"
              disabled={!sessionKey.trim()}
              variant="warning"
            />
          </div>
          {sessionAction.status === "error" && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{sessionAction.message}</p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Clears a stuck or timed-out agent session.
          </p>
        </div>

        {/* ── 3. Timeout ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Agent Timeout
            </label>
            {currentTimeout !== null && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                current: {currentTimeout}s ({Math.round(currentTimeout / 60)}m)
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(e.target.value)}
              min={30}
              step={60}
              disabled={timeoutAction.status === "loading"}
              className="w-28 px-3 py-2 rounded-lg border bg-transparent text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>seconds</span>
            <div className="flex-1" />
            <ActionButton
              onClick={saveTimeout}
              status={timeoutAction.status}
              label="Save"
            />
          </div>
          {timeoutAction.status === "error" && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{timeoutAction.message}</p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Default 300s. Increase if your local model is slow to load (e.g. 1200s for 14B models).
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Shared button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  onClick: () => void;
  status: Status;
  label: string;
  disabled?: boolean;
  variant?: "default" | "warning";
}

function ActionButton({ onClick, status, label, disabled, variant = "default" }: ActionButtonProps) {
  const isLoading = status === "loading";
  const isOk = status === "ok";
  const isError = status === "error";

  const bg = isError
    ? "#ef444420"
    : isOk
    ? "#22c55e20"
    : variant === "warning"
    ? "#f9731620"
    : "var(--accent)";

  const color = isError
    ? "#ef4444"
    : isOk
    ? "#22c55e"
    : variant === "warning"
    ? "#f97316"
    : "var(--accent-foreground, #fff)";

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0 disabled:opacity-40"
      style={{ backgroundColor: bg, color }}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isOk ? (
        <Check className="w-3.5 h-3.5" />
      ) : isError ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : null}
      {isOk ? "Done" : isError ? "Error" : label}
    </button>
  );
}