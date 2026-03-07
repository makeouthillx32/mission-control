'use client';

/**
 * useDMR.ts
 * React hook that mirrors useDockerModelRunner from the open-webui-docker-extension.
 *
 * Lifecycle mirrors:
 *   - useDmrWarmupGate    → initializing state + gate logic
 *   - DMRStatusCache      → local state as cache (server holds the real cache)
 *   - useDockerModelRunner polling loop → setInterval on DMR_POLL_INTERVAL_*
 *   - ensureIntegration   → provision() called on mount + interval
 *   - retryIntegration    → force POST to /api/dmr
 *   - commitStatus        → setStatus()
 *   - gateMode            → dmrState.gateMode: 'hard' | 'soft' | 'none'
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Mirrors DMR_POLL_INTERVAL_READY_MS / DMR_POLL_INTERVAL_NOT_READY_MS
const POLL_INTERVAL_READY_MS = 2 * 60 * 1000;   // 2 min when healthy
const POLL_INTERVAL_NOT_READY_MS = 10_000;        // 10s when DMR unreachable

export type DMRGateMode = 'hard' | 'soft' | 'none';

export interface DMRStatus {
  reachable: boolean;
  models: string[];
  modelCount: number;
  lastChecked: string;
  dmrBaseUrl: string;
  engineSuffix: string;
  error: string | null;
  patched: boolean;
  primaryModel: string | null;
  fromCache?: boolean;
}

export interface UseDMRResult {
  status: DMRStatus | null;
  gateMode: DMRGateMode;
  initializing: boolean;
  provision: (force?: boolean) => Promise<void>;
  clearStatus: () => void;
}

export function useDMR(): UseDMRResult {
  const [status, setStatus] = useState<DMRStatus | null>(null);
  const [gateMode, setGateMode] = useState<DMRGateMode>('hard');
  const [initializing, setInitializing] = useState(false);
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<DMRStatus | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mirrors commitStatus — update local state and derive gateMode
  const commitStatus = useCallback((next: DMRStatus) => {
    if (!mountedRef.current) return;
    setStatus(next);
    statusRef.current = next;

    if (next.reachable && next.patched) {
      // Integration fully ready — mirrors isDMRReady → gateMode 'none'
      setGateMode('none');
    } else if (next.reachable && !next.patched) {
      // DMR up but patch failed — show warning but don't hard-block
      setGateMode('soft');
    } else {
      // DMR unreachable — hard gate, keep retrying
      setGateMode('hard');
    }
  }, []);

  // Mirrors ensureIntegration — deduped, in-flight aware
  const runProvision = useCallback(async (force = false) => {
    if (inFlightRef.current && !force) {
      return inFlightRef.current;
    }

    const run = async () => {
      if (!mountedRef.current) return;
      setInitializing(true);

      try {
        const res = await fetch('/api/dmr', {
          method: force ? 'POST' : 'GET',
        });

        if (!mountedRef.current) return;

        if (!res.ok) {
          console.warn('[useDMR] API error:', res.status);
          return;
        }

        const data = (await res.json()) as DMRStatus;
        if (mountedRef.current) {
          commitStatus(data);
        }
      } catch (err) {
        console.warn('[useDMR] fetch failed:', err);
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
        }
      }
    };

    const promise = run().finally(() => {
      if (inFlightRef.current === promise) {
        inFlightRef.current = null;
      }
    });
    inFlightRef.current = promise;
    return promise;
  }, [commitStatus]);

  // Initial probe on mount — mirrors the useEffect that calls ensureIntegration on service ready
  useEffect(() => {
    void runProvision(false);
  }, [runProvision]);

  // Polling loop — mirrors the setInterval in useDockerModelRunner
  // Poll rate adapts to DMR health, same as DMR_POLL_INTERVAL_*
  const dmrReady = status?.reachable && status?.patched;
  const pollIntervalMs = dmrReady ? POLL_INTERVAL_READY_MS : POLL_INTERVAL_NOT_READY_MS;

  useEffect(() => {
    const id = setInterval(() => {
      void runProvision(false);
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, runProvision]);

  // Mirrors retryIntegration — force POST, clear local state first
  const provision = useCallback(async (force = false) => {
    if (force) {
      setStatus(null);
      statusRef.current = null;
      setGateMode('hard');
    }
    await runProvision(force);
  }, [runProvision]);

  const clearStatus = useCallback(() => {
    setStatus(null);
    statusRef.current = null;
    setGateMode('hard');
  }, []);

  return { status, gateMode, initializing, provision, clearStatus };
}