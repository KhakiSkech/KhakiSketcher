import { z } from 'zod';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { loadSession } from '../session/store.js';
import { detectProviders } from '../providers/detector.js';

export const kskHudSchema = {
  refresh: z.boolean().default(false).describe('Force refresh provider availability check'),
};

type Args = z.infer<z.ZodObject<typeof kskHudSchema>>;

const ARTIFACT_CATEGORIES = ['reason', 'vision', 'classify', 'review'] as const;
const ARTIFACT_BASE = '.ksk/artifacts';

function countArtifacts(category: string, cwd: string): number {
  const dir = join(cwd, ARTIFACT_BASE, category);
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

function formatDuration(totalMs: number, calls: number): string {
  if (calls === 0) return '-';
  const avg = totalMs / calls;
  return avg >= 1000 ? `${(avg / 1000).toFixed(1)}s` : `${Math.round(avg)}ms`;
}

function formatTokens(n: number): string {
  if (n === 0) return '-';
  return `~${n.toLocaleString()}`;
}

function timeSince(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function checkCliVersion(cmd: string): string {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
    return 'OK';
  } catch {
    return 'unavailable';
  }
}

export async function kskHudHandler(args: Args) {
  try {
    const cwd = process.cwd();
    const session = loadSession(cwd);

    // Provider availability
    const availability = args.refresh
      ? (() => {
          // Re-detect with force=true
          const codexStatus = checkCliVersion('codex');
          const geminiStatus = checkCliVersion('gemini');
          return { codex: codexStatus === 'OK', gemini: geminiStatus === 'OK' };
        })()
      : detectProviders();

    const providerStatus = (name: 'codex' | 'gemini') =>
      availability[name] ? 'OK' : 'unavailable';

    const codexStats = session.provider_stats.codex;
    const geminiStats = session.provider_stats.gemini;

    // Artifact counts
    const counts: Record<string, number> = {};
    let total = 0;
    for (const cat of ARTIFACT_CATEGORIES) {
      const n = countArtifacts(cat, cwd);
      counts[cat] = n;
      total += n;
    }

    // Recent artifacts (last 3)
    const recentArtifacts: Array<{ cat: string; name: string; mtime: Date }> = [];
    for (const cat of ARTIFACT_CATEGORIES) {
      const dir = join(cwd, ARTIFACT_BASE, cat);
      if (!existsSync(dir)) continue;
      try {
        const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
        for (const f of files) {
          try {
            const stat = statSync(join(dir, f));
            recentArtifacts.push({ cat, name: f, mtime: stat.mtime });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
    recentArtifacts.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const recent3 = recentArtifacts.slice(0, 3);

    // Last task from session classification
    const lastTask = session.last_classification
      ? `${session.last_classification.primary.category} (confidence: ${session.last_classification.primary.confidence.toFixed(2)})`
      : '(none)';

    const lines: string[] = [
      '## KhakiSketcher HUD',
      '',
      '### Session',
      `- Started: ${session.session_started} (${timeSince(session.session_started)})`,
      `- Last Task: ${lastTask}`,
      '',
      '### Providers',
      '| Provider | Status | Calls | Avg Duration | Est Tokens | Rate Limits |',
      '|----------|--------|-------|-------------|------------|-------------|',
      `| Codex    | ${providerStatus('codex')}  | ${codexStats.call_count}     | ${formatDuration(codexStats.total_duration_ms, codexStats.call_count)}        | ${formatTokens(codexStats.estimated_tokens)}     | ${codexStats.rate_limit_count}           |`,
      `| Gemini   | ${providerStatus('gemini')}  | ${geminiStats.call_count}     | ${formatDuration(geminiStats.total_duration_ms, geminiStats.call_count)}        | ${formatTokens(geminiStats.estimated_tokens)}     | ${geminiStats.rate_limit_count}           |`,
      '',
      '### Artifacts (This Session)',
      '| Category | Count |',
      '|----------|-------|',
      ...ARTIFACT_CATEGORIES.map((cat) => `| ${cat}     | ${counts[cat]}     |`),
      `| **Total**| **${total}**|`,
      '',
      '### Claude Context',
      'Use `/cost` in Claude Code to see current context token usage.',
      '',
    ];

    if (recent3.length > 0) {
      lines.push('### Recent Artifacts');
      for (const a of recent3) {
        lines.push(`- [${a.cat}] ${a.name} (${timeSince(a.mtime.toISOString())})`);
      }
    } else {
      lines.push('### Recent Artifacts');
      lines.push('(none yet)');
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_hud error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
