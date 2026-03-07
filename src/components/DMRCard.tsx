'use client';

/**
 * DMRCard.tsx
 * Docker Model Runner status + provision panel for the Settings page.
 *
 * Drop into Settings page alongside <IntegrationStatus /> and <SystemInfo />.
 *
 * Usage:
 *   import { DMRCard } from '@/components/DMRCard';
 *   <DMRCard />
 */

import { useDMR } from '@/hooks/useDMR';
import { RefreshCw, Cpu, Zap, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

function StatusDot({ reachable, patched }: { reachable: boolean; patched: boolean }) {
  if (reachable && patched) {
    return <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />;
  }
  if (reachable && !patched) {
    return <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />;
  }
  return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
}

function GateBadge({ mode }: { mode: 'hard' | 'soft' | 'none' }) {
  const map = {
    hard: { label: 'Unreachable', color: '#ef4444' },
    soft: { label: 'Partial', color: '#f59e0b' },
    none: { label: 'Connected', color: '#22c55e' },
  };
  const { label, color } = map[mode];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-mono"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  );
}

export function DMRCard() {
  const { status, gateMode, initializing, provision } = useDMR();

  const handleSync = () => {
    void provision(true);
  };

  return (
    <div
      className="rounded-2xl p-4 md:p-6"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <span
            className="font-semibold text-sm"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            Docker Model Runner
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status && <GateBadge mode={gateMode} />}
          <button
            onClick={handleSync}
            disabled={initializing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <RefreshCw className={`w-3 h-3 ${initializing ? 'animate-spin' : ''}`} />
            {initializing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {!status && initializing && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 rounded animate-pulse"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', width: `${60 + i * 10}%` }}
            />
          ))}
        </div>
      )}

      {/* No status yet, not loading */}
      {!status && !initializing && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No DMR status yet. Click Sync to probe.
        </p>
      )}

      {/* Status content */}
      {status && (
        <div className="space-y-3">
          {/* Connection row */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {status.dmrBaseUrl}{status.engineSuffix}
            </span>
            <StatusDot reachable={status.reachable} patched={status.patched} />
          </div>

          {/* Error */}
          {status.error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {status.error}
            </p>
          )}

          {/* Models list */}
          {status.reachable && status.models.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                {status.modelCount} model{status.modelCount !== 1 ? 's' : ''} available
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {status.models.map((model) => (
                  <div
                    key={model}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                      {model}
                    </span>
                    {status.primaryModel === `dmr/${model}` && (
                      <span className="flex items-center gap-1 text-xs ml-2 shrink-0" style={{ color: 'var(--accent)' }}>
                        <Zap className="w-3 h-3" />
                        primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* openclaw.json patch status */}
          <div
            className="flex items-center justify-between text-xs pt-2"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <span>openclaw.json</span>
            <span style={{ color: status.patched ? '#22c55e' : '#f59e0b' }}>
              {status.patched ? '✓ patched' : '— not patched'}
            </span>
          </div>

          {/* Last checked */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}