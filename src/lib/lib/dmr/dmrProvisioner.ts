/**
 * dmrProvisioner.ts
 * Server-side Docker Model Runner provisioner for Mission Control.
 *
 * Architecture mirrors rw4lll/open-webui-docker-extension:
 *   connectivityTest.ts   → dmrProbe()
 *   dmrStatusCache.ts     → DMRStatusCache (in-memory, server-side)
 *   openAIEnvProvisioner  → patchOpenclawConfig()
 *   useDockerModelRunner  → useDMR() React hook (see useDMR.ts)
 *
 * Key difference from the open-webui extension:
 *   - They register DMR into Open WebUI's admin API (OPENAI_API_BASE_URLS)
 *   - We patch openclaw.json's models.providers block directly
 *   - No containerCurl needed — server-side fetch hits DMR directly
 */

import fs from 'fs';
import path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DMRModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
}

export interface DMRProbeResult {
  reachable: boolean;
  models: string[];
  error?: string;
  checkedAt: number;
}

export interface DMRStatus {
  reachable: boolean;
  models: string[];
  modelCount: number;
  lastChecked: string;
  dmrBaseUrl: string;
  engineSuffix: string;
  error: string | null;
  /** Whether openclaw.json was successfully patched on last provision */
  patched: boolean;
  /** Which model is set as primary (dmr/<id>) */
  primaryModel: string | null;
}

// ─── Config signature (mirrors createDMRConfigSignature) ────────────────────

export function createDMRConfigSignature(baseUrl: string, engineSuffix: string): string {
  return `${baseUrl.trim()}|${engineSuffix.trim()}`;
}

// ─── In-memory status cache (mirrors DMRStatusCache / dmrStatusCache.ts) ────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — same as dmr-provision.js

interface CacheEntry {
  status: DMRStatus;
  signature: string;
  cachedAt: number;
}

let _cache: CacheEntry | null = null;

export const dmrStatusCache = {
  get(signature: string): DMRStatus | null {
    if (!_cache) return null;
    if (_cache.signature !== signature) return null;
    if (Date.now() - _cache.cachedAt > CACHE_TTL_MS) {
      _cache = null;
      return null;
    }
    return _cache.status;
  },

  set(status: DMRStatus, signature: string): void {
    _cache = { status, signature, cachedAt: Date.now() };
  },

  clear(): void {
    _cache = null;
  },
};

// ─── DMR probe (mirrors connectivityTest.ts + dmrProbe()) ───────────────────

const DEFAULT_DMR_BASE_URL =
  process.env.DMR_POWER_URL || 'http://model-runner.docker.internal';
const DEFAULT_ENGINE_SUFFIX = '/engines/v1';
const PROBE_TIMEOUT_MS = 8_000;

export function getDMRConfig() {
  return {
    baseUrl: process.env.DMR_POWER_URL || DEFAULT_DMR_BASE_URL,
    engineSuffix: DEFAULT_ENGINE_SUFFIX,
  };
}

export async function dmrProbe(): Promise<DMRProbeResult> {
  const { baseUrl, engineSuffix } = getDMRConfig();
  const url = `${baseUrl}${engineSuffix}/models`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = (await res.json()) as unknown;

    // DMR returns { data: [ { id, ... } ] } — OpenAI list format
    let models: string[] = [];
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      if (Array.isArray(record.data)) {
        models = (record.data as Array<{ id: string }>).map((m) => m.id);
      }
    } else if (Array.isArray(body)) {
      models = (body as Array<{ id: string }>).map((m) => m.id);
    }

    return { reachable: true, models, checkedAt: Date.now() };
  } catch (err) {
    return {
      reachable: false,
      models: [],
      error: err instanceof Error ? err.message : String(err),
      checkedAt: Date.now(),
    };
  }
}

// ─── openclaw.json patcher (mirrors openAIEnvProvisioner.setupIntegration) ──

const OPENCLAW_HOME =
  process.env.OPENCLAW_DIR ||
  path.join(process.env.HOME || '/root', '.openclaw');

const OPENCLAW_JSON = path.join(OPENCLAW_HOME, 'openclaw.json');

function readOpenclawConfig(): Record<string, unknown> {
  if (!fs.existsSync(OPENCLAW_JSON)) {
    throw new Error(`openclaw.json not found at ${OPENCLAW_JSON}`);
  }
  return JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf8')) as Record<string, unknown>;
}

function writeOpenclawConfig(cfg: Record<string, unknown>): void {
  fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(cfg, null, 2), 'utf8');
}

function buildModelEntry(id: string): DMRModel {
  return {
    id,
    name: id,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 32768,
    maxTokens: 8192,
  };
}

export interface PatchResult {
  patched: boolean;
  primaryModel: string | null;
  error?: string;
}

export function patchOpenclawConfig(models: string[]): PatchResult {
  try {
    const { baseUrl, engineSuffix } = getDMRConfig();
    const cfg = readOpenclawConfig();

    // Ensure nested structure exists
    if (!cfg.models || typeof cfg.models !== 'object') cfg.models = {};
    const modelsBlock = cfg.models as Record<string, unknown>;
    if (!modelsBlock.providers || typeof modelsBlock.providers !== 'object') {
      modelsBlock.providers = {};
    }
    const providers = modelsBlock.providers as Record<string, unknown>;
    modelsBlock.mode = modelsBlock.mode || 'merge';

    // Inject / overwrite the "dmr" provider block
    providers.dmr = {
      baseUrl: `${baseUrl}${engineSuffix}`,
      apiKey: 'local-dmr',
      api: 'openai-completions',
      models: models.map(buildModelEntry),
    };

    // Remove stale ollama facade if it was pointing at local DMR proxy
    const ollama = providers.ollama as { baseUrl?: string } | undefined;
    if (ollama?.baseUrl === 'http://127.0.0.1:11434') {
      delete providers.ollama;
    }

    // Set primary model if not already pointing at dmr/*
    if (!cfg.agents || typeof cfg.agents !== 'object') cfg.agents = {};
    const agents = cfg.agents as Record<string, unknown>;
    if (!agents.defaults || typeof agents.defaults !== 'object') agents.defaults = {};
    const defaults = agents.defaults as Record<string, unknown>;
    if (!defaults.model || typeof defaults.model !== 'object') defaults.model = {};
    const modelConfig = defaults.model as Record<string, unknown>;

    let primaryModel: string | null = null;
    const currentPrimary = modelConfig.primary as string | undefined;
    if (!currentPrimary || !currentPrimary.startsWith('dmr/')) {
      primaryModel = models[0] ? `dmr/${models[0]}` : null;
      if (primaryModel) {
        modelConfig.primary = primaryModel;
      }
    } else {
      primaryModel = currentPrimary;
    }

    writeOpenclawConfig(cfg);
    return { patched: true, primaryModel };
  } catch (err) {
    return {
      patched: false,
      primaryModel: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Main provision cycle (mirrors useDockerModelRunner ensureIntegration) ──

export async function provision(options: { force?: boolean } = {}): Promise<DMRStatus> {
  const { baseUrl, engineSuffix } = getDMRConfig();
  const signature = createDMRConfigSignature(baseUrl, engineSuffix);

  // Check cache first (mirrors verifyIntegration short-circuit)
  if (!options.force) {
    const cached = dmrStatusCache.get(signature);
    if (cached) return cached;
  }

  const probe = await dmrProbe();

  const status: DMRStatus = {
    reachable: probe.reachable,
    models: probe.models,
    modelCount: probe.models.length,
    lastChecked: new Date(probe.checkedAt).toISOString(),
    dmrBaseUrl: baseUrl,
    engineSuffix,
    error: probe.error ?? null,
    patched: false,
    primaryModel: null,
  };

  if (!probe.reachable || probe.models.length === 0) {
    // Don't cache failures — retry next time
    dmrStatusCache.clear();
    return status;
  }

  // Patch openclaw.json (mirrors setupIntegration / patchOpenclawConfig)
  const patchResult = patchOpenclawConfig(probe.models);
  status.patched = patchResult.patched;
  status.primaryModel = patchResult.primaryModel;
  if (patchResult.error) {
    status.error = patchResult.error;
  }

  // Cache the result (mirrors commitStatus + defaultDMRStatusCache.set)
  dmrStatusCache.set(status, signature);
  return status;
}