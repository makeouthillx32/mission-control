// src/hooks/useGatewayStatus.ts
"use client";

// useGatewayStatus — replaces the tanstack-query version that depended on
// a non-existent gatewayApi export from src/lib/api.ts.
// Uses the OpenClaw gateway RPC directly via useOpenClaw context.

import { useState, useEffect, useCallback } from "react";
import { useOpenClaw } from "@/contexts/OpenClawContext";

export interface GatewayStatusData {
  running: boolean;
  port?: number;
  mode?: string;
  agentCount?: number;
}

export function useGatewayStatus() {
  const { rpc, isConnected } = useOpenClaw();
  const [data, setData] = useState<GatewayStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!isConnected) return;
    setIsLoading(true);
    try {
      const res = await rpc("health") as any;
      setData({
        running: res?.ok ?? isConnected,
        port: res?.port,
        mode: res?.mode,
        agentCount: res?.agentCount,
      });
    } catch {
      setData({ running: isConnected });
    } finally {
      setIsLoading(false);
    }
  }, [rpc, isConnected]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 10_000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Mirror disconnection state immediately
  useEffect(() => {
    if (!isConnected) setData(d => d ? { ...d, running: false } : { running: false });
  }, [isConnected]);

  return { data, isLoading, refetch };
}

export function useGatewayRestart() {
  const { rpc, isConnected } = useOpenClaw();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (
    _: undefined,
    callbacks?: { onSettled?: () => void }
  ) => {
    if (!isConnected) return;
    setIsPending(true);
    try {
      await (rpc as any)("config.patch", {
        raw: JSON.stringify({ gateway: { restart: true } }),
      });
    } catch {
      // Gateway restart disconnects the WS — error is expected
    } finally {
      setIsPending(false);
      callbacks?.onSettled?.();
    }
  }, [rpc, isConnected]);

  return { mutate, isPending };
}