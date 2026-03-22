// src/components/GatewayControls/DefaultModel/index.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { useOpenClawModels } from "@/hooks/use-openclaw-models";
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
  const { } = useOpenClawModels();

  const [configCache, setConfigCache] = useState<{ baseHash: string; config: any } | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!isConnected) return null;
    try {
      const res = await (rpc as any)("config.get");
      const baseHash = res?.baseHash ?? res?.hash ?? "";
      const config = res?.config ?? res?.resolved ?? res;
      setConfigCache({ baseHash, config });
      return { baseHash, config };
    } catch {
      return null;
    }
  }, [isConnected, rpc]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const getBaseHash = async (): Promise<string> => {
    if (configCache?.baseHash) return configCache.baseHash;
    const fresh = await fetchConfig();
    if (!fresh?.baseHash) throw new Error("Could not get config hash — try refreshing");
    return fresh.baseHash;
  };

  const getConfigVal = (path: string): string | null => {
    if (!configCache?.config) return null;
    let cur: any = configCache.config;
    for (const p of path.split(".")) {
      if (cur == null || typeof cur !== "object") return null;
      cur = cur[p];
    }
    return cur != null ? String(cur) : null;
  };

  const [selectedModel, setSelectedModel] = useState("");
  const modelAction = useAction();
  const currentPrimary = getConfigVal("agents.defaults.model.primary");

  const switchModel = () =>
    modelAction.run(async () => {
      if (!selectedModel) throw new Error("Select a model first");
      const baseHash = await getBaseHash();
      await (rpc as any)("config.patch", {
        raw: JSON.stringify({
          agents: { defaults: { model: { primary: selectedModel } } }
        }),
        baseHash,
      });
      setConfigCache(null);
      setSelectedModel("");
    });

  const [timeoutVal, setTimeoutVal] = useState("300");
  const timeoutAction = useAction();
  const currentTimeout = getConfigVal("agents.defaults.timeoutSeconds");

  useEffect(() => {
    if (currentTimeout) setTimeoutVal(currentTimeout);
  }, [currentTimeout]);

  const saveTimeout = () =>
    timeoutAction.run(async () => {
      const val = parseInt(timeoutVal);
      if (isNaN(val) || val < 30) throw new Error("Must be at least 30 seconds");
      const baseHash = await getBaseHash();
      await (rpc as any)("config.patch", {
        raw: JSON.stringify({
          agents: { defaults: { timeoutSeconds: val } }
        }),
        baseHash,
      });
      setConfigCache(null);
    });

  if (!isConnected) return null;

  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Primary Model
            </label>
            {currentPrimary && (
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                active: {currentPrimary.split("/").pop()}
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Agent Timeout
            </label>
            {currentTimeout && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                current: {currentTimeout}s ({Math.round(Number(currentTimeout) / 60)}m)
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={timeoutVal}
              onChange={(e) => setTimeoutVal(e.target.value)}
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
            <ActionButton onClick={saveTimeout} status={timeoutAction.status} label="Save" />
          </div>
          {timeoutAction.status === "error" && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{timeoutAction.message}</p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Set to 1200 for 14B local models (cold load ~60s + inference time).
          </p>
        </div>

      </div>
    </div>
  );
}

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
  const bg = isError ? "#ef444420" : isOk ? "#22c55e20" : variant === "warning" ? "#f9731620" : "var(--accent)";
  const color = isError ? "#ef4444" : isOk ? "#22c55e" : variant === "warning" ? "#f97316" : "var(--accent-foreground, #fff)";
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0 disabled:opacity-40"
      style={{ backgroundColor: bg, color }}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isOk ? <Check className="w-3.5 h-3.5" /> : isError ? <AlertCircle className="w-3.5 h-3.5" /> : null}
      {isOk ? "Done" : isError ? "Error" : label}
    </button>
  );
}