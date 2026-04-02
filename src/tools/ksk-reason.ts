import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { resolveProviders } from '../providers/resolver.js';
import { smartTruncate } from '../utils/truncate.js';
import { isRateLimited } from '../providers/types.js';
import { geminiProReasoningProvider } from '../providers/gemini-runner.js';
import { codexReasoningProvider } from '../providers/codex-runner.js';
import { writeArtifact } from '../artifacts/writer.js';
import { addArtifactPath, recordProviderCall } from '../session/store.js';

// Raw shape for MCP server registration
export const kskReasonSchema = {
  prompt: z.string().describe('The analysis/review prompt for deep reasoning'),
  effort: z.enum(['low', 'medium', 'high', 'xhigh']).default('high').describe('Reasoning effort level'),
  context_files: z.array(z.string()).optional().describe('File paths to read and include as context'),
  cwd: z.string().optional().describe('Working directory'),
};

type Args = z.infer<z.ZodObject<typeof kskReasonSchema>>;

export async function kskReasonHandler(args: Args) {
  try {
    const { reasoning } = resolveProviders();

    let fullPrompt = args.prompt;

    // Read actual file contents (not just list paths)
    if (args.context_files?.length) {
      const fileContents: string[] = [];
      for (const filepath of args.context_files.slice(0, 10)) {
        if (existsSync(filepath)) {
          const content = readFileSync(filepath, 'utf-8');
          const truncated = smartTruncate(content, filepath, { maxChars: 4000 });
          fileContents.push(`### ${filepath}\n\`\`\`\n${truncated}\n\`\`\``);
        }
      }
      if (fileContents.length > 0) {
        fullPrompt = `## Context Files\n\n${fileContents.join('\n\n')}\n\n## Task\n\n${args.prompt}`;
      }
    }

    const result = reasoning.reason(fullPrompt, args.effort, args.cwd);

    if (isRateLimited(result)) {
      recordProviderCall(result.provider, 0, 0, true, args.cwd);

      // Auto-fallback: try the other provider once
      const { availability } = resolveProviders();
      const canFallback =
        (result.provider === 'codex' && availability.gemini) ||
        (result.provider === 'gemini' && availability.codex);

      if (canFallback) {
        const fallbackProvider =
          result.provider === 'codex' ? geminiProReasoningProvider : codexReasoningProvider;
        const fallbackResult = fallbackProvider.reason(fullPrompt, args.effort, args.cwd);

        if (!isRateLimited(fallbackResult)) {
          recordProviderCall(fallbackResult.provider, fallbackResult.duration_ms, fallbackResult.output.length, false, args.cwd);
          const artifactPath = writeArtifact('reason', fallbackResult.output, args.prompt.slice(0, 60), args.cwd);
          addArtifactPath(artifactPath, args.cwd);
          return {
            content: [{
              type: 'text' as const,
              text: [
                `## Deep Reasoning Result (Auto-Fallback)`,
                `**Provider**: ${fallbackResult.provider} (auto-fallback from ${result.provider}) | **Effort**: ${args.effort} | **Duration**: ${fallbackResult.duration_ms}ms`,
                `**Artifact**: ${artifactPath}`,
                '',
                fallbackResult.output,
              ].join('\n'),
            }],
          };
        }
        // Fallback also rate-limited — fall through to escalation
        recordProviderCall(fallbackResult.provider, 0, 0, true, args.cwd);
      }

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
            '',
            `**Options:**`,
            `1. Wait for reset and retry ksk_reason`,
            `2. Skip analysis and proceed with Claude Sonnet only (lower quality)`,
          ].filter(Boolean).join('\n'),
        }],
      };
    }

    recordProviderCall(result.provider, result.duration_ms, result.output.length, false, args.cwd);

    const artifactPath = writeArtifact(
      'reason',
      result.output,
      args.prompt.slice(0, 60),
      args.cwd,
    );

    addArtifactPath(artifactPath, args.cwd);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `## Deep Reasoning Result`,
          `**Provider**: ${result.provider} | **Effort**: ${args.effort} | **Duration**: ${result.duration_ms}ms`,
          `**Artifact**: ${artifactPath}`,
          '',
          result.output,
        ].join('\n'),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_reason error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
