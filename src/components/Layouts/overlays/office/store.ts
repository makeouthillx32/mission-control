// src/components/Layouts/overlays/office/store.ts
// External store — no Provider needed. Works across React tree boundaries.
// ClientLayout overlays and Office3D canvas both import this directly.

import { useSyncExternalStore } from "react";

export type ModalType = "memory" | "roadmap" | "energy" | null;

export interface OfficeState {
  controlMode: "orbit" | "fps";
  selectedAgent: string | null;
  interactionModal: ModalType;
  // Agent data populated by Office3D
  agents: { id: string; name: string; emoji: string; color: string; role: string; position: [number, number, number] }[];
  agentStates: Record<string, { id: string; status: string; currentTask?: string; model?: string; tokensPerHour?: number; tasksInQueue?: number; uptime?: number }>;
  loading: boolean;
}

const initialState: OfficeState = {
  controlMode: "orbit",
  selectedAgent: null,
  interactionModal: null,
  agents: [],
  agentStates: {},
  loading: true,
};

let state: OfficeState = { ...initialState };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export const officeStore = {
  // Read
  getSnapshot: () => state,
  getServerSnapshot: () => initialState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Write
  setControlMode: (m: "orbit" | "fps") => { state = { ...state, controlMode: m }; notify(); },
  setSelectedAgent: (id: string | null) => { state = { ...state, selectedAgent: id }; notify(); },
  setInteractionModal: (m: ModalType) => { state = { ...state, interactionModal: m }; notify(); },
  setAgents: (agents: OfficeState["agents"]) => { state = { ...state, agents }; notify(); },
  setAgentStates: (agentStates: OfficeState["agentStates"]) => { state = { ...state, agentStates }; notify(); },
  setLoading: (loading: boolean) => { state = { ...state, loading }; notify(); },

  // Reset when leaving the page
  reset: () => { state = { ...initialState }; notify(); },
};

// Hook — use anywhere, no Provider required
export function useOfficeStore(): OfficeState & typeof officeStore {
  const snap = useSyncExternalStore(
    officeStore.subscribe,
    officeStore.getSnapshot,
    officeStore.getServerSnapshot,
  );
  return { ...snap, ...officeStore };
}