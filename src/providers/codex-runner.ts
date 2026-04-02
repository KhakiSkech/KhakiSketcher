import { spawn } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ReasoningEffort,
  ProviderResponse,
  ReasoningProvider,
  VisionProvider,
} from './types.js';
import { isRateLimited } from './types.js';

const RATE_LIMIT_PATTERNS = [
  /rate\s*limit/i,
  /429/,
  /too many requests/i,
  /quota exceeded/i,
  /token quota/i,
  /usage limit/i,
];

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

function isRateLimitError(stderr: string, stdout: string): boolean {
  const combined = stderr + stdout;
  return RATE_LIMIT_PATTERNS.some((p) => p.test(combined));
}

function parseRetryAfter(stderr: string): number | undefined {
  const match = stderr.match(/retry[- ]after[:\s]+(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function spawnAsync(command: string, args: string[], opts: { cwd: string; env: Record<string, string | undefined>; timeout: number }): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() + '\nTimed out', status: null });
    }, opts.timeout);

    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), status });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, status: 1 });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * Parse JSONL output from `codex exec --json`.
 * Extracts the text content from the last assistant_message event,
 * or falls back to any "result" type event output.
 */
function parseJsonlOutput(raw: string): string | null {
  const lines = raw.split('\n').filter((l) => l.trim());
  let lastAssistantText: string | null = null;
  let resultOutput: string | null = null;

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      if (event.type === 'message' && event.role === 'assistant' && Array.isArray(event.content)) {
        const textParts = event.content
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text: string }) => c.text);
        if (textParts.length > 0) {
          lastAssistantText = textParts.join('\n');
        }
      }

      if (event.type === 'result' && typeof event.output === 'string') {
        resultOutput = event.output;
      }
    } catch {
      // Not valid JSON — skip this line
    }
  }

  return lastAssistantText ?? resultOutput;
}

async function runCodexOnce(
  prompt: string,
  effort: ReasoningEffort,
  cwd: string,
): Promise<SpawnResult> {
  const outFile = join(tmpdir(), `ksk-codex-${Date.now()}.txt`);

  const args = [
    'exec',
    '--ephemeral',
    '-s', 'read-only',
    '-c', `model_reasoning_effort="${effort}"`,
    '--json',
    '-o', outFile,
    prompt,
  ];

  const result = await spawnAsync('codex', args, { cwd, env: { ...process.env }, timeout: 300_000 });

  // Priority 1: Parse --json JSONL from stdout for precise extraction
  const rawStdout = result.stdout || '';
  const jsonlParsed = rawStdout ? parseJsonlOutput(rawStdout) : null;

  // Priority 2: Read -o outfile content
  let fileOutput = '';
  if (existsSync(outFile)) {
    fileOutput = readFileSync(outFile, 'utf-8').trim();
    try { unlinkSync(outFile); } catch { /* skip */ }
  }

  const stdout = jsonlParsed || fileOutput || rawStdout;

  return { stdout, stderr: result.stderr, status: result.status };
}

export const codexReasoningProvider: ReasoningProvider = {
  name: 'codex',
  async reason(prompt, effort, cwd = process.cwd()): Promise<ProviderResponse> {
    const start = Date.now();

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const { stdout, stderr, status } = await runCodexOnce(prompt, effort, cwd);

      if (isRateLimitError(stderr, stdout)) {
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        const retryAfter = parseRetryAfter(stderr);
        return {
          rate_limited: true,
          provider: 'codex',
          retry_after_seconds: retryAfter,
          message: [
            `Codex rate limit reached after ${attempt + 1} retries.`,
            retryAfter ? `Estimated reset: ~${Math.ceil(retryAfter / 60)} minutes.` : '',
            `Options: (1) Wait and retry manually, (2) Skip analysis, (3) Use Gemini fallback.`,
          ].filter(Boolean).join(' '),
        };
      }

      if (status !== 0 && !stdout) {
        throw new Error(`Codex failed (exit ${status}): ${stderr || 'unknown error'}`);
      }

      return {
        output: stdout || stderr,
        provider: 'codex',
        duration_ms: Date.now() - start,
      };
    }

    throw new Error('Codex: unexpected retry loop exit');
  },
};

export const codexVisionProvider: VisionProvider = {
  name: 'codex',
  async analyze(prompt, images, cwd = process.cwd()): Promise<ProviderResponse> {
    const FALLBACK_WARNING =
      '⚠️ Codex Vision Fallback: Codex cannot decode images. Proceeding with text-based reasoning about the described content only — no actual visual analysis.';
    const imageContext = images.map((img) => `[Image path: ${img}]`).join('\n');
    const fullPrompt = `${imageContext}\n\nAnalyze the described visual content (text-based reasoning only):\n${prompt}`;
    const result = await codexReasoningProvider.reason(fullPrompt, 'high', cwd);
    if (isRateLimited(result)) return result;
    return { ...result, output: `${FALLBACK_WARNING}\n\n${result.output}` };
  },
};
