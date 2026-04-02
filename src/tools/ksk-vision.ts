import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolveProviders } from '../providers/resolver.js';
import { isRateLimited } from '../providers/types.js';
import { geminiProVisionProvider, geminiFlashVisionProvider } from '../providers/gemini-runner.js';
import { codexVisionProvider } from '../providers/codex-runner.js';
import { writeArtifact } from '../artifacts/writer.js';
import { addArtifactPath, recordProviderCall } from '../session/store.js';

export const kskVisionSchema = {
  prompt: z.string().describe('The visual analysis prompt'),
  images: z.array(z.string()).describe('Image file paths to analyze'),
  mode: z.enum(['analyze', 'compare', 'qa']).default('analyze').describe('Vision analysis mode'),
  fast: z.boolean().default(false).describe('Use Gemini Flash (faster) instead of Gemini Pro (deeper)'),
  cwd: z.string().optional().describe('Working directory'),
};

type Args = z.infer<z.ZodObject<typeof kskVisionSchema>>;

export async function kskVisionHandler(args: Args) {
  try {
    const missing = args.images.filter((img) => !existsSync(img));
    if (missing.length > 0) {
      return {
        content: [{ type: 'text' as const, text: `ksk_vision error: image file(s) not found: ${missing.join(', ')}` }],
        isError: true,
      };
    }

    const providers = resolveProviders();
    const vision = args.fast ? providers.visionFast : providers.vision;

    const modePrefix: Record<string, string> = {
      analyze: 'Analyze the visual design. Check layout, spacing, colors, and consistency:',
      compare: 'Compare the before and after images. List ALL visual differences, classify as intentional or regression:',
      qa: 'Perform thorough visual QA. Check 8px grid alignment, spacing, WCAG AA contrast, and overall quality:',
    };

    const fullPrompt = `${modePrefix[args.mode]}\n\n${args.prompt}`;
    const result = await vision.analyze(fullPrompt, args.images, args.cwd);

    if (isRateLimited(result)) {
      recordProviderCall(result.provider, 0, 0, true, args.cwd);

      // Auto-fallback: try the other provider once
      const { availability } = resolveProviders();
      const canFallback =
        (result.provider === 'gemini' && availability.codex) ||
        (result.provider === 'codex' && availability.gemini);

      if (canFallback) {
        const fallbackVision =
          result.provider === 'gemini'
            ? codexVisionProvider
            : args.fast ? geminiFlashVisionProvider : geminiProVisionProvider;
        const fallbackResult = await fallbackVision.analyze(fullPrompt, args.images, args.cwd);

        if (!isRateLimited(fallbackResult)) {
          recordProviderCall(fallbackResult.provider, fallbackResult.duration_ms, fallbackResult.output.length, false, args.cwd);
          const artifactPath = writeArtifact(
            'vision',
            fallbackResult.output,
            `${args.mode}-${args.prompt.slice(0, 40)}`,
            args.cwd,
          );
          addArtifactPath(artifactPath, args.cwd);
          return {
            content: [{
              type: 'text' as const,
              text: [
                `## Vision Analysis Result (Auto-Fallback)`,
                `**Provider**: ${fallbackResult.provider} (auto-fallback from ${result.provider}) | **Mode**: ${args.mode} | **Duration**: ${fallbackResult.duration_ms}ms`,
                `**Images**: ${args.images.join(', ')}`,
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
            `1. Wait for reset and retry ksk_vision`,
            `2. Skip visual analysis and use Claude's text-based assessment`,
            `3. Try with fast=true to switch to Gemini Flash model`,
          ].filter(Boolean).join('\n'),
        }],
      };
    }

    recordProviderCall(result.provider, result.duration_ms, result.output.length, false, args.cwd);

    const artifactPath = writeArtifact(
      'vision',
      result.output,
      `${args.mode}-${args.prompt.slice(0, 40)}`,
      args.cwd,
    );

    addArtifactPath(artifactPath, args.cwd);

    const modelNote = args.fast ? 'gemini-2.0-flash' : 'gemini-2.5-pro';

    return {
      content: [{
        type: 'text' as const,
        text: [
          `## Vision Analysis Result`,
          `**Provider**: ${result.provider} (${modelNote}) | **Mode**: ${args.mode} | **Duration**: ${result.duration_ms}ms`,
          `**Images**: ${args.images.join(', ')}`,
          `**Artifact**: ${artifactPath}`,
          '',
          result.output,
        ].join('\n'),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_vision error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
