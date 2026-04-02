import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { TaskCategory } from '../classify/rules.js';

export interface CompositeClassifyResult {
  is_composite: boolean;
  primary: {
    category: TaskCategory;
    confidence: number;
    scores: Record<string, number>;
  };
  subtasks?: Array<{
    category: TaskCategory;
    confidence: number;
    scores: Record<string, number>;
  }>;
  execution_order: TaskCategory[];
}

export interface ProviderStats {
  call_count: number;
  total_duration_ms: number;
  rate_limit_count: number;
  estimated_tokens: number;
  last_call_at?: string;
}

export interface SessionContext {
  last_classification?: CompositeClassifyResult;
  artifact_paths: string[];
  last_updated: string;
  session_started: string;
  provider_stats: {
    codex: ProviderStats;
    gemini: ProviderStats;
  };
}

const SESSION_FILE = '.ksk/session.json';

function getSessionPath(cwd?: string): string {
  return join(cwd || process.cwd(), SESSION_FILE);
}

function defaultProviderStats(): ProviderStats {
  return { call_count: 0, total_duration_ms: 0, rate_limit_count: 0, estimated_tokens: 0 };
}

export function loadSession(cwd?: string): SessionContext {
  const path = getSessionPath(cwd);
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SessionContext>;
      return {
        artifact_paths: parsed.artifact_paths ?? [],
        last_updated: parsed.last_updated ?? new Date().toISOString(),
        session_started: parsed.session_started ?? new Date().toISOString(),
        provider_stats: {
          codex: parsed.provider_stats?.codex ?? defaultProviderStats(),
          gemini: parsed.provider_stats?.gemini ?? defaultProviderStats(),
        },
        last_classification: parsed.last_classification,
      };
    }
  } catch {
    // Corrupted file — return fresh session
  }
  return {
    artifact_paths: [],
    last_updated: new Date().toISOString(),
    session_started: new Date().toISOString(),
    provider_stats: {
      codex: defaultProviderStats(),
      gemini: defaultProviderStats(),
    },
  };
}

export function saveSession(ctx: SessionContext, cwd?: string): void {
  const path = getSessionPath(cwd);
  try {
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    const updated: SessionContext = { ...ctx, last_updated: new Date().toISOString() };
    // Atomic write: write to .tmp then rename (POSIX rename(2) is atomic on ext4/same-fs)
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(updated, null, 2), 'utf-8');
    renameSync(tmpPath, path);
  } catch {
    // Non-critical — silently ignore write failures
  }
}

const MAX_ARTIFACT_PATHS = 200;

export function addArtifactPath(artifactPath: string, cwd?: string): void {
  const session = loadSession(cwd);
  const paths = [...session.artifact_paths];
  if (!paths.includes(artifactPath)) {
    paths.push(artifactPath);
  }
  const capped = paths.length > MAX_ARTIFACT_PATHS ? paths.slice(-MAX_ARTIFACT_PATHS) : paths;
  saveSession({ ...session, artifact_paths: capped }, cwd);
}

export function setLastClassification(result: CompositeClassifyResult, cwd?: string): void {
  const session = loadSession(cwd);
  saveSession({ ...session, last_classification: result }, cwd);
}

export function recordProviderCall(
  provider: 'codex' | 'gemini',
  duration_ms: number,
  output_length: number,
  isRateLimit: boolean,
  cwd?: string,
): void {
  const session = loadSession(cwd);
  const stats = { ...session.provider_stats[provider] };

  if (isRateLimit) {
    stats.rate_limit_count += 1;
  } else {
    stats.call_count += 1;
    stats.total_duration_ms += duration_ms;
    stats.estimated_tokens += Math.ceil(output_length / 4);
  }
  stats.last_call_at = new Date().toISOString();

  saveSession({
    ...session,
    provider_stats: {
      ...session.provider_stats,
      [provider]: stats,
    },
  }, cwd);
}
