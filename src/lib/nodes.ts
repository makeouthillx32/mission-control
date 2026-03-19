// src/lib/nodes.ts
// Display constants and helpers for gateway_nodes.
// Imported by nodes/page.tsx and nodes/AddNodeModal.tsx.

export const OS_EMOJI: Record<string, string> = {
  windows: "🪟",
  linux:   "🐧",
  android: "🤖",
  macos:   "🍎",
  ios:     "📱",
};

export const ROLE_META: Record<string, { label: string; color: string; desc: string }> = {
  gateway: { label: "Gateway",        color: "var(--accent)",            desc: "Runs OpenClaw gateway" },
  node:    { label: "Compute Node",   color: "var(--info, #3b82f6)",     desc: "Docker deployments only" },
  both:    { label: "Gateway + Node", color: "var(--positive)",          desc: "Gateway + compute node" },
};

export const DEVICE_TYPE_OPTIONS = [
  { value: "server",    label: "Server" },
  { value: "desktop",   label: "Desktop" },
  { value: "vps",       label: "VPS / Cloud" },
  { value: "baremetal", label: "Bare Metal" },
  { value: "android",   label: "Android" },
] as const;

export const OS_OPTIONS = [
  { value: "linux",   label: "🐧 Linux" },
  { value: "windows", label: "🪟 Windows" },
  { value: "android", label: "🤖 Android" },
  { value: "macos",   label: "🍎 macOS" },
] as const;