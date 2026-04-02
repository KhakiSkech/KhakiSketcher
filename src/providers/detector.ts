import { execSync } from 'node:child_process';
import type { ProviderAvailability } from './types.js';

function isCliAvailable(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

let cached: ProviderAvailability | null = null;

export function detectProviders(force = false): ProviderAvailability {
  if (cached && !force) return cached;

  cached = {
    codex: isCliAvailable('codex'),
    gemini: isCliAvailable('gemini'),
  };

  return cached;
}
