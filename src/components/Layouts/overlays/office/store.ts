// src/components/Layouts/overlays/office/store.ts
import { useSyncExternalStore } from "react";

export type ModalType = "memory" | "roadmap" | "energy" | null;

export interface OfficeState {
  // true only while Office3D component is mounted — gates all overlays
  active: boolean;
  controlMode: "orbit" | "fps";
  selectedAgent: string | null;
  interactionModal: ModalType;
  agents: {
    id: string; name: string; emoji: string; color: string;
    role: string; position: [number, number, number];
  }[];
  agentStates: Record<string, {
    id: string; status: string; currentTask?: string; model?: string;
    tokensPerHour?: number; tasksInQueue?: number; uptime?: number;
  }>;
  loading: boolean;
}

const initialState: OfficeState = {
  active: false,          // ← overlays check this first
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
  getSnapshot:       () => state,
  getServerSnapshot: () => initialState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setActive:            (v: boolean)        => { state = { ...state, active: v };            notify(); },
  setControlMode:       (m: "orbit"|"fps")  => { state = { ...state, controlMode: m };       notify(); },
  setSelectedAgent:     (id: string|null)   => { state = { ...state, selectedAgent: id };    notify(); },
  setInteractionModal:  (m: ModalType)      => { state = { ...state, interactionModal: m };  notify(); },
  setAgents:            (agents: OfficeState["agents"]) => { state = { ...state, agents };   notify(); },
  setAgentStates:       (s: OfficeState["agentStates"]) => { state = { ...state, agentStates: s }; notify(); },
  setLoading:           (v: boolean)        => { state = { ...state, loading: v };           notify(); },

  // Reset called on unmount — active=false hides all overlays immediately,
  // loading stays false so skeleton never flickers on next mount until fetch starts
  reset: () => {
    state = { ...initialState, active: false, loading: false };
    notify();
  },
};

export function useOfficeStore(): OfficeState & typeof officeStore {
  const snap = useSyncExternalStore(
    officeStore.subscribe,
    officeStore.getSnapshot,
    officeStore.getServerSnapshot,
  );
  return { ...snap, ...officeStore };
}