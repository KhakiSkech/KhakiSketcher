import { spawn } from 'node:child_process';
import type {
  ProviderResponse,
  ReasoningProvider,
  VisionProvider,
  GeminiModel,
} from './types.js';

const GEMINI_PRO_MODEL = (process.env.KSK_GEMINI_PRO_MODEL || 'gemini-2.5-pro') as GeminiModel;
const GEMINI_FLASH_MODEL = (process.env.KSK_GEMINI_FLASH_MODEL || 'gemini-2.0-flash') as GeminiModel;

const RATE_LIMIT_PATTERNS = [
  /rate\s*limit/i,
  /429/,
  /too many requests/i,
  /quota exceeded/i,
  /resource has been exhausted/i,
  /RESOURCE_EXHAUSTED/,
];

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

function isRateLimitError(text: string): boolean {
  return RATE_LIMIT_PATTERNS.some((p) => p.test(text));
}

function parseRetryAfter(text: string): number | undefined {
  const match = text.match(/retry[- ]after[:\s]+(\d+)/i);
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

async function runGeminiOnce(
  prompt: string,
  model: GeminiModel,
  cwd: string,
): Promise<SpawnResult> {
  const args = [
    '-p', prompt,
    '-m', model,
    '-y',
    '--output-format', 'text',
  ];

  return spawnAsync('gemini', args, { cwd, env: { ...process.env }, timeout: 300_000 });
}

async function runGeminiWithRetry(
  prompt: string,
  model: GeminiModel,
  cwd: string,
): Promise<ProviderResponse> {
  const start = Date.now();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { stdout, stderr, status } = await runGeminiOnce(prompt, model, cwd);
    const combined = stdout + stderr;

    if (isRateLimitError(combined)) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const retryAfter = parseRetryAfter(combined);
      return {
        rate_limited: true,
        provider: 'gemini',
        retry_after_seconds: retryAfter,
        message: [
          `Gemini rate limit reached after ${attempt + 1} retries (model: ${model}).`,
          retryAfter ? `Estimated reset: ~${Math.ceil(retryAfter / 60)} minutes.` : '',
          `Options: (1) Wait and retry manually, (2) Skip visual analysis, (3) Use Codex as fallback.`,
        ].filter(Boolean).join(' '),
      };
    }

    if (status !== 0 && !stdout) {
      throw new Error(`Gemini failed (exit ${status}): ${stderr || 'unknown error'}`);
    }

    return {
      output: stdout || stderr,
      provider: 'gemini',
      duration_ms: Date.now() - start,
    };
  }

  throw new Error('Gemini: unexpected retry loop exit');
}

// Gemini Pro: deep analysis, visual QA, design review
export const geminiProReasoningProvider: ReasoningProvider = {
  name: 'gemini',
  async reason(prompt, _effort, cwd = process.cwd()) {
    const prefixed = `You are acting as a deep reasoning engine. Think step by step with maximum depth and rigor.\n\n${prompt}`;
    return runGeminiWithRetry(prefixed, GEMINI_PRO_MODEL, cwd);
  },
};

// Gemini Pro: detailed visual analysis
export const geminiProVisionProvider: VisionProvider = {
  name: 'gemini',
  async analyze(prompt, images, cwd = process.cwd(), _model?: GeminiModel) {
    const imageRefs = images.map((img) => img.includes(' ') ? `@"${img}"` : `@${img}`).join(' ');
    const fullPrompt = `${imageRefs}\n\n${prompt}`;
    return runGeminiWithRetry(fullPrompt, GEMINI_PRO_MODEL, cwd);
  },
};

// Gemini Flash: fast visual guidance, publishing checks, rapid iteration
export const geminiFlashVisionProvider: VisionProvider = {
  name: 'gemini',
  async analyze(prompt, images, cwd = process.cwd(), _model?: GeminiModel) {
    const imageRefs = images.map((img) => img.includes(' ') ? `@"${img}"` : `@${img}`).join(' ');
    const fullPrompt = `${imageRefs}\n\n${prompt}`;
    return runGeminiWithRetry(fullPrompt, GEMINI_FLASH_MODEL, cwd);
  },
};
