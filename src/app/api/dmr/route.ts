/**
 * src/app/api/dmr/route.ts
 *
 * GET  /api/dmr  → return current DMR status (from cache or fresh probe)
 * POST /api/dmr  → force re-provision (clears cache, re-probes, patches openclaw.json)
 */

import { NextResponse } from 'next/server';
import { provision, dmrStatusCache, getDMRConfig, createDMRConfigSignature } from '@/lib/dmr/dmrProvisioner';

export async function GET() {
  try {
    const { baseUrl, engineSuffix } = getDMRConfig();
    const signature = createDMRConfigSignature(baseUrl, engineSuffix);

    // Return cached status if available — fast path, mirrors verifyIntegration cache check
    const cached = dmrStatusCache.get(signature);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    // No cache — run a fresh probe (read-only, no patch)
    const status = await provision({ force: false });
    return NextResponse.json({ ...status, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/dmr] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Force re-provision: clear cache, re-probe, patch openclaw.json
    // Mirrors retryIntegration → clearCachedStatus → setupDockerModelRunnerIntegration
    dmrStatusCache.clear();
    const status = await provision({ force: true });
    return NextResponse.json({ ...status, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/dmr] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}