// src/components/Layouts/overlays/office/context.tsx
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AgentConfig, AgentState } from "@/components/Office3D/agentsConfig";
import { DESK_POSITIONS, FALLBACK_COLORS } from "@/components/Office3D/agentsConfig";

export type ModalType = "memory" | "roadmap" | "energy" | null;

interface OfficeAgent {
  id: string; name: string; emoji: string; color: string;
  role: string; currentTask: string; isActive: boolean;
}

interface OfficeContextType {
  controlMode: "orbit" | "fps";
  setControlMode: (m: "orbit" | "fps") => void;
  agents: AgentConfig[];
  agentStates: Record<string, AgentState>;
  loading: boolean;
  selectedAgent: string | null;
  setSelectedAgent: (id: string | null) => void;
  interactionModal: ModalType;
  setInteractionModal: (m: ModalType) => void;
  activeCount: number;
  getState: (id: string) => AgentState;
}

// null default — consumers must guard with `if (!ctx) return null`
const OfficeContext = createContext<OfficeContextType | null>(null);

// Returns null if no provider is present (safe for prerender / non-office pages)
export function useOfficeContext(): OfficeContextType | null {
  return useContext(OfficeContext);
}

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [controlMode, setControlMode]           = useState<"orbit" | "fps">("orbit");
  const [agents, setAgents]                     = useState<AgentConfig[]>([]);
  const [agentStates, setAgentStates]           = useState<Record<string, AgentState>>({});
  const [loading, setLoading]                   = useState(true);
  const [selectedAgent, setSelectedAgent]       = useState<string | null>(null);
  const [interactionModal, setInteractionModal] = useState<ModalType>(null);

  useEffect(() => {
    async function fetchOffice() {
      try {
        const res = await fetch("/api/office");
        if (!res.ok) throw new Error();
        const data = await res.json();
        const raw: OfficeAgent[] = data.agents || [];
        setAgents(raw.map((a, i) => ({
          id: a.id, name: a.name, emoji: a.emoji,
          color: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          role: a.role,
          position: DESK_POSITIONS[i] ?? ([0, 0, i * 3] as [number, number, number]),
        })));
        const states: Record<string, AgentState> = {};
        for (const a of raw) {
          states[a.id] = { id: a.id, status: a.isActive ? "working" : "idle",
            currentTask: a.currentTask, model: "sonnet",
            tokensPerHour: 0, tasksInQueue: 0, uptime: 0 };
        }
        setAgentStates(states);
      } catch { /* silent */ } finally { setLoading(false); }
    }
    fetchOffice();
    const t = setInterval(fetchOffice, 30_000);
    return () => clearInterval(t);
  }, []);

  const getState = (id: string): AgentState =>
    agentStates[id] ?? { id, status: "idle" };
  const activeCount = Object.values(agentStates).filter(s => s.status === "working").length;

  return (
    <OfficeContext.Provider value={{
      controlMode, setControlMode, agents, agentStates, loading,
      selectedAgent, setSelectedAgent, interactionModal, setInteractionModal,
      activeCount, getState,
    }}>
      {children}
    </OfficeContext.Provider>
  );
}