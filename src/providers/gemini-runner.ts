import { spawnSync } from 'node:child_process';
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

function runGeminiOnce(
  prompt: string,
  model: GeminiModel,
  cwd: string,
): { stdout: string; stderr: string; status: number | null } {
  const args = [
    '-p', prompt,
    '-m', model,
    '-y',                     // yolo: auto-approve all actions
    '--output-format', 'text',
  ];

  const result = spawnSync('gemini', args, {
    cwd,
    encoding: 'utf-8',
    timeout: 300_000,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  return {
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
    status: result.status,
  };
}

function runGeminiWithRetry(
  prompt: string,
  model: GeminiModel,
  cwd: string,
): ProviderResponse {
  const start = Date.now();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { stdout, stderr, status } = runGeminiOnce(prompt, model, cwd);
    const combined = stdout + stderr;

    if (isRateLimitError(combined)) {
      if (attempt < RETRY_DELAYS_MS.length) {
        const waitMs = RETRY_DELAYS_MS[attempt];
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
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
  reason(prompt, _effort, cwd = process.cwd()) {
    const prefixed = `You are acting as a deep reasoning engine. Think step by step with maximum depth and rigor.\n\n${prompt}`;
    return runGeminiWithRetry(prefixed, GEMINI_PRO_MODEL, cwd);
  },
};

// Gemini Pro: detailed visual analysis
export const geminiProVisionProvider: VisionProvider = {
  name: 'gemini',
  analyze(prompt, images, cwd = process.cwd(), _model?: GeminiModel) {
    // Use @file syntax — Gemini CLI's ReadManyFilesTool loads images as inlineData multimodal content
    const imageRefs = images.map((img) => img.includes(' ') ? `@"${img}"` : `@${img}`).join(' ');
    const fullPrompt = `${imageRefs}\n\n${prompt}`;
    return runGeminiWithRetry(fullPrompt, GEMINI_PRO_MODEL, cwd);
  },
};

// Gemini Flash: fast visual guidance, publishing checks, rapid iteration
export const geminiFlashVisionProvider: VisionProvider = {
  name: 'gemini',
  analyze(prompt, images, cwd = process.cwd(), _model?: GeminiModel) {
    const imageRefs = images.map((img) => img.includes(' ') ? `@"${img}"` : `@${img}`).join(' ');
    const fullPrompt = `${imageRefs}\n\n${prompt}`;
    return runGeminiWithRetry(fullPrompt, GEMINI_FLASH_MODEL, cwd);
  },
};
