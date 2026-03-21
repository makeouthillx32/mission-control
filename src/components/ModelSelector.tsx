"use client";

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

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? "#6b7280";
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    groq: "Groq",
    ollama: "Ollama",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    xai: "xAI",
    dmr: "DMR (Local)",
  };
  return labels[provider.toLowerCase()] ?? provider;
}

interface ModelSelectorProps {
  /** Currently selected model ID */
  value: string;
  onChange: (modelId: string) => void;
  /** Placeholder shown when value is empty (defaults to "— Use gateway default —") */
  placeholder?: string;
  /** Whether the field is disabled */
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

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Gateway disconnected — model list unavailable</span>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Loading models…</span>
      </div>
    );
  }

  // ── No models (gateway returned empty) — fall back to text input ───────────
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

  // ── Find the selected model for the preview dot ────────────────────────────
  const selected = models.find((m) => m.id === value);
  const selectedProvider = selected?.provider ?? null;

  return (
    <div className={`relative ${className}`}>
      {/* Provider color dot shown inside the select box */}
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
        {/* Blank / default option */}
        <option value="" style={{ backgroundColor: "var(--card)" }}>
          {placeholder}
        </option>

        {/* One <optgroup> per provider */}
        {Object.entries(byProvider)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([provider, providerModels]) => (
            <optgroup
              key={provider}
              label={`${providerLabel(provider)} (${providerModels.length})`}
              style={{ backgroundColor: "var(--card)", color: "var(--text-muted)" }}
            >
              {providerModels.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  style={{ backgroundColor: "var(--card)", color: "var(--text-primary)" }}
                >
                  {m.name || m.id}
                  {m.reasoning ? " ✦" : ""}
                </option>
              ))}
            </optgroup>
          ))}
      </select>

      <ChevronDown
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      />
    </div>
  );
}