export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';
export type ProviderName = 'codex' | 'gemini';
export type RoleName = 'reasoning' | 'vision';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.0-flash';

export interface ProviderResult {
  output: string;
  provider: ProviderName;
  duration_ms: number;
  artifact_path?: string;
}

export interface RateLimitResult {
  rate_limited: true;
  provider: ProviderName;
  retry_after_seconds?: number;
  message: string;
}

export type ProviderResponse = ProviderResult | RateLimitResult;

export function isRateLimited(r: ProviderResponse): r is RateLimitResult {
  return 'rate_limited' in r && r.rate_limited === true;
}

export interface ReasoningProvider {
  name: ProviderName;
  reason(prompt: string, effort: ReasoningEffort, cwd?: string): Promise<ProviderResponse>;
}

export interface VisionProvider {
  name: ProviderName;
  analyze(prompt: string, images: string[], cwd?: string, model?: GeminiModel): Promise<ProviderResponse>;
}

export interface ProviderAvailability {
  codex: boolean;
  gemini: boolean;
}

export interface ResolvedProviders {
  reasoning: ReasoningProvider;
  vision: VisionProvider;
  availability: ProviderAvailability;
  fallbacks: string[];
}
