import { detectProviders } from './detector.js';
import { codexReasoningProvider, codexVisionProvider } from './codex-runner.js';
import {
  geminiProReasoningProvider,
  geminiProVisionProvider,
  geminiFlashVisionProvider,
} from './gemini-runner.js';
import type { ResolvedProviders, VisionProvider, ReasoningProvider, ReasoningEffort } from './types.js';

export interface ExtendedProviders extends ResolvedProviders {
  visionFast: VisionProvider; // Gemini Flash for rapid iteration
}

export function resolveProviders(): ExtendedProviders {
  const availability = detectProviders();
  const fallbacks: string[] = [];

  // Reasoning: Codex (1순위) → Gemini Pro (2순위)
  let reasoning: ReasoningProvider = codexReasoningProvider;
  if (!availability.codex && availability.gemini) {
    reasoning = geminiProReasoningProvider;
    fallbacks.push('reasoning: codex unavailable → gemini-2.5-pro as fallback');
  }

  // Vision: Gemini Pro (1순위) → Codex (2순위)
  let vision: VisionProvider = geminiProVisionProvider;
  let visionFast: VisionProvider = geminiFlashVisionProvider;
  if (!availability.gemini && availability.codex) {
    vision = codexVisionProvider;
    visionFast = codexVisionProvider;
    fallbacks.push('vision: gemini unavailable → codex as fallback');
  }

  if (!availability.codex && !availability.gemini) {
    fallbacks.push('WARNING: both codex and gemini unavailable — Claude Sonnet only mode');
    const stubMsg = (role: string) =>
      `⚠️ No external provider available (Codex and Gemini both uninstalled).\n\nThis ${role} request requires Codex CLI or Gemini CLI. Install one of them and restart the session, or proceed with Claude Sonnet directly.`;

    reasoning = {
      name: 'codex',
      reason: (_prompt: string, _effort: ReasoningEffort, _cwd?: string) => ({
        output: stubMsg('reasoning'),
        provider: 'codex',
        duration_ms: 0,
      }),
    };
    const stubVision: VisionProvider = {
      name: 'gemini',
      analyze: (_prompt, _images, _cwd) => ({
        output: stubMsg('vision'),
        provider: 'gemini',
        duration_ms: 0,
      }),
    };
    vision = stubVision;
    visionFast = stubVision;
  }

  return { reasoning, vision, visionFast, availability, fallbacks };
}
