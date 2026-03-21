"use client";

import { useState } from "react";
import { ChevronDown, Loader2, WifiOff } from "lucide-react";
import { useOpenClawModels } from "@/hooks/use-openclaw-models";
import { useOpenClaw } from "@/contexts/OpenClawContext";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
  google: "#4285f4",
  groq: "#f97316",
  ollama: "#888888",
  mistral: "#ff7000",
  deepseek: "#0ea5e9",
  xai: "#333333",
  dmr: "#a855f7",
};

function providerColor(p: string): string {
  return PROVIDER_COLORS[p.toLowerCase()] ?? "#6b7280";
}

function providerLabel(p: string): string {
  const labels: Record<string, string> = {
    openai: "OpenAI", anthropic: "Anthropic", google: "Google",
    groq: "Groq", ollama: "Ollama", mistral: "Mistral",
    deepseek: "DeepSeek", xai: "xAI", dmr: "DMR (Local)",
  };
  return labels[p.toLowerCase()] ?? p;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  placeholder = "— Use gateway default —",
  disabled = false,
  className = "",
}: ModelSelectorProps) {
  const { isConnected } = useOpenClaw();
  const { models, byProvider, loading } = useOpenClawModels();
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Gateway disconnected — model list unavailable</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Loading models…</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. google/gemini-2.0-flash"
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg border bg-transparent text-sm font-mono outline-none transition-all ${className}`}
        style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    );
  }

  const providers = Object.keys(byProvider).sort((a, b) => a.localeCompare(b));
  const selected = models.find((m) => m.id === value);
  const selectedProvider = selected?.provider ?? null;
  const filteredModels = activeProvider ? (byProvider[activeProvider] ?? []) : null;

  const handleProviderClick = (p: string) => {
    const next = activeProvider === p ? null : p;
    setActiveProvider(next);
    // Clear model selection if it's not in the newly active provider
    if (next && selected && selected.provider !== next) {
      onChange("");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Provider filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {providers.map((p) => {
          const isActive = activeProvider === p;
          const color = providerColor(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => handleProviderClick(p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? `${color}22` : "var(--card-elevated, var(--card))",
                border: `1px solid ${isActive ? color : "var(--border)"}`,
                color: isActive ? color : "var(--text-secondary)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {providerLabel(p)}
              <span className="opacity-60 text-[10px]">{byProvider[p]?.length}</span>
            </button>
          );
        })}
      </div>

      {/* Model dropdown */}
      <div className="relative">
        {selectedProvider && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none z-10"
            style={{ backgroundColor: providerColor(selectedProvider) }}
          />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full py-2 pr-8 rounded-lg border bg-transparent text-sm outline-none appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            paddingLeft: selectedProvider ? "1.75rem" : "0.75rem",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            backgroundColor: "var(--card)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        >
          <option value="" style={{ backgroundColor: "var(--card)" }}>{placeholder}</option>

          {filteredModels ? (
            filteredModels.map((m) => (
              <option key={m.id} value={m.id} style={{ backgroundColor: "var(--card)", color: "var(--text-primary)" }}>
                {m.name || m.id}{m.reasoning ? " ✦" : ""}
              </option>
            ))
          ) : (
            providers.map((p) => (
              <optgroup key={p} label={`${providerLabel(p)} (${byProvider[p]?.length})`} style={{ backgroundColor: "var(--card)", color: "var(--text-muted)" }}>
                {(byProvider[p] ?? []).map((m) => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: "var(--card)", color: "var(--text-primary)" }}>
                    {m.name || m.id}{m.reasoning ? " ✦" : ""}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}