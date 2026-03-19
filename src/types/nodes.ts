// src/types/nodes.ts
// Types for the gateway_nodes Supabase table (infrastructure environments).
// Separate from types/gateway.ts which covers the OpenClaw wire protocol.

export interface GatewayNode {
  id: string;
  hostname: string;
  label: string;
  ip: string | null;
  port: number;
  role: "gateway" | "node" | "both";
  os: string | null;
  arch: string | null;
  device_type: string | null;
  is_online: boolean;           // derived in gateway_nodes_with_status view
  last_seen: string | null;
  gateway_version: string | null;
  active_agents: number;
  active_sessions: number;
  gateway_model: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type GatewayNodeInsert = Pick<
  GatewayNode,
  "hostname" | "label" | "ip" | "port" | "role" | "os" | "arch" | "device_type" | "notes"
>;

export type GatewayNodePatch = Partial<GatewayNodeInsert> & { id: string };

export type NodeRole = GatewayNode["role"];