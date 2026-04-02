import { z } from 'zod';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { smartTruncate } from '../utils/truncate.js';
import { resolveProviders } from '../providers/resolver.js';
import { isRateLimited } from '../providers/types.js';
import { writeArtifact } from '../artifacts/writer.js';
import { addArtifactPath, recordProviderCall } from '../session/store.js';

export const kskPlanSchema = {
  task_description: z.string().describe('Task description for auto file discovery and planning'),
  effort: z.enum(['low', 'medium', 'high', 'xhigh']).default('high'),
  max_files: z.number().int().min(1).max(20).default(10).describe('Max files to include'),
  cwd: z.string().optional(),
};

type Args = z.infer<z.ZodObject<typeof kskPlanSchema>>;

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.json']);

function extractKeywords(description: string): string[] {
  const results = new Set<string>();

  // File extension mentions
  const filePattern = /\b[\w-]+\.(ts|tsx|js|jsx|py|css|json)\b/g;
  for (const m of description.matchAll(filePattern)) {
    results.add(m[0]);
  }

  // PascalCase identifiers (class/component names)
  const pascalPattern = /\b[A-Z][a-zA-Z]{2,}\b/g;
  for (const m of description.matchAll(pascalPattern)) {
    results.add(m[0]);
  }

  // camelCase identifiers
  const camelPattern = /\b[a-z][a-z]+[A-Z][a-zA-Z]+\b/g;
  for (const m of description.matchAll(camelPattern)) {
    results.add(m[0]);
  }

  // Quoted module paths
  const pathPattern = /['"]([./][^'"]+)['"]/g;
  for (const m of description.matchAll(pathPattern)) {
    results.add(m[1]);
  }

  // Plain significant words (>4 chars, not common stopwords)
  const stopwords = new Set(['function', 'const', 'import', 'export', 'return', 'from', 'that', 'this', 'with', 'when', 'where', 'should', 'would', 'could', 'their', 'there', 'have', 'been', 'will', 'what', 'which']);
  const wordPattern = /\b[a-zA-Z]{5,}\b/g;
  for (const m of description.matchAll(wordPattern)) {
    const w = m[0].toLowerCase();
    if (!stopwords.has(w)) results.add(w);
  }

  return [...results].slice(0, 30);
}

function walkDir(dir: string, depth = 0): string[] {
  if (depth > 5) return [];
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...walkDir(fullPath, depth + 1));
        } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
          results.push(fullPath);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return results;
}

function scoreFile(filePath: string, keywords: string[]): number {
  let score = 0;
  const lowerPath = filePath.toLowerCase();

  // Score by keyword presence in path
  for (const kw of keywords) {
    if (lowerPath.includes(kw.toLowerCase())) score += 2;
  }

  // Native content matching — no external grep process needed
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const kw of keywords.slice(0, 10)) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = content.match(new RegExp(escaped, 'gi'));
      if (matches) score += matches.length;
    }
  } catch { /* unreadable file — skip */ }

  return score;
}

export async function kskPlanHandler(args: Args) {
  try {
    const cwd = args.cwd || process.cwd();
    const keywords = extractKeywords(args.task_description);

    // Discover source files
    const srcDir = join(cwd, 'src');
    const searchDir = existsSync(srcDir) ? srcDir : cwd;
    const allFiles = walkDir(searchDir);

    // Score and rank files by relevance
    const scored = allFiles.map((f) => ({ path: f, score: scoreFile(f, keywords) }));
    scored.sort((a, b) => b.score - a.score);

    const topFiles = scored
      .filter((f) => f.score > 0)
      .slice(0, args.max_files)
      .map((f) => f.path);

    // If no files scored, take first N files alphabetically as fallback
    const filesToRead = topFiles.length > 0 ? topFiles : allFiles.slice(0, args.max_files);

    // Read file contents (same logic as ksk_reason)
    const fileContents: string[] = [];
    for (const filepath of filesToRead) {
      if (existsSync(filepath)) {
        try {
          const content = readFileSync(filepath, 'utf-8');
          const truncated = smartTruncate(content, filepath, { maxChars: 4000 });
          fileContents.push(`### ${filepath}\n\`\`\`\n${truncated}\n\`\`\``);
        } catch { /* skip unreadable files */ }
      }
    }

    const fileSection = fileContents.length > 0
      ? `## Auto-Discovered Context Files (${fileContents.length} files, keywords: ${keywords.slice(0, 5).join(', ')})\n\n${fileContents.join('\n\n')}`
      : '## Context Files\n(no relevant files found)';

    const fullPrompt = `${fileSection}\n\n## Task\n\n${args.task_description}`;

    const { reasoning } = resolveProviders();
    const result = await reasoning.reason(fullPrompt, args.effort, cwd);

    if (isRateLimited(result)) {
      recordProviderCall(result.provider, 0, 0, true, args.cwd);
      return {
        content: [{
          type: 'text' as const,
          text: [
            `## Rate Limit Reached`,
            `**Provider**: ${result.provider}`,
            result.retry_after_seconds
              ? `**Estimated reset**: ~${Math.ceil(result.retry_after_seconds / 60)} minutes`
              : '',
            '',
            result.message,
          ].filter(Boolean).join('\n'),
        }],
      };
    }

    recordProviderCall(result.provider, result.duration_ms, result.output.length, false, args.cwd);

    const artifactPath = writeArtifact(
      'reason',
      result.output,
      args.task_description.slice(0, 60),
      args.cwd,
    );
    addArtifactPath(artifactPath, args.cwd);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `## Plan Result`,
          `**Provider**: ${result.provider} | **Effort**: ${args.effort} | **Duration**: ${result.duration_ms}ms`,
          `**Files Analyzed**: ${filesToRead.length} (keywords: ${keywords.slice(0, 5).join(', ')})`,
          `**Artifact**: ${artifactPath}`,
          '',
          result.output,
        ].join('\n'),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_plan error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
