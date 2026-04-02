import { z } from 'zod';
import { writeArtifact } from '../artifacts/writer.js';

export const kskReviewGateSchema = {
  review_text: z.string().describe('Review result text to parse into structured verdict'),
  iteration: z.number().int().min(1).default(1).describe('Current iteration number'),
  max_iterations: z.number().int().min(1).default(3).describe('Maximum allowed iterations'),
};

type Verdict = 'PASS' | 'FAIL_MINOR' | 'FAIL_MAJOR' | 'FAIL_CRITICAL';
type Action = 'complete' | 'self_fix' | 're_analyze' | 'escalate_to_user';

interface Issue {
  severity: 'minor' | 'major' | 'critical';
  description: string;
  file?: string;
  line?: number;
  suggested_fix?: string;
}

/**
 * Extract file:line references from text.
 * Matches patterns like "file: path.ts:42" or "path/to/file.ts:123"
 */
function extractFileRef(text: string): { file?: string; line?: number } {
  // Pattern: "file: path.ts:42" or "file: path.ts"
  const fileColonMatch = text.match(/file:\s*([^\s:]+\.(?:ts|tsx|js|jsx|py|go|rs|java|css|html))(?::(\d+))?/i);
  if (fileColonMatch) {
    return {
      file: fileColonMatch[1],
      line: fileColonMatch[2] ? parseInt(fileColonMatch[2], 10) : undefined,
    };
  }
  // Pattern: standalone "path/file.ts:42"
  const pathMatch = text.match(/([a-zA-Z0-9_./\\-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|css|html)):(\d+)/);
  if (pathMatch) {
    return { file: pathMatch[1], line: parseInt(pathMatch[2], 10) };
  }
  return {};
}

/**
 * Try to parse a structured "## Verdict:" section from the review text.
 * Returns null if the section is not found, falling back to heuristic.
 */
function parseStructuredVerdict(text: string): Verdict | null {
  const verdictMatch = text.match(/##\s*Verdict:\s*(PASS|FAIL_MINOR|FAIL_MAJOR|FAIL_CRITICAL)/i);
  if (!verdictMatch) return null;
  return verdictMatch[1].toUpperCase() as Verdict;
}

function parseHeuristicVerdict(text: string): Verdict {
  const lower = text.toLowerCase();

  if (/critical|심각|보안\s*취약|security\s*vuln|data\s*loss/i.test(lower)) return 'FAIL_CRITICAL';
  if (/major|주요|심각한\s*결함|regression|회귀/i.test(lower)) return 'FAIL_MAJOR';
  if (/minor|경미|스타일|style|nit|suggestion|개선/i.test(lower)) return 'FAIL_MINOR';
  if (/pass|통과|lgtm|approved|좋[아습]|문제\s*없/i.test(lower)) return 'PASS';

  // Default: if the review text is short and doesn't mention issues, assume pass
  return lower.length < 200 ? 'PASS' : 'FAIL_MINOR';
}

function parseVerdict(text: string): Verdict {
  // Priority 1: Structured "## Verdict:" section
  const structured = parseStructuredVerdict(text);
  if (structured) return structured;
  // Priority 2: Heuristic keyword matching
  return parseHeuristicVerdict(text);
}

/**
 * Extract issues from structured "## Issues" section if present,
 * with severity tags like [CRITICAL], [MAJOR], [MINOR].
 * Falls back to heuristic extraction.
 */
function extractStructuredIssues(text: string): Issue[] | null {
  const issuesSectionMatch = text.match(/##\s*Issues\s*\n([\s\S]*?)(?=\n##\s|\n---|\Z|$)/i);
  if (!issuesSectionMatch) return null;

  const section = issuesSectionMatch[1];
  const issues: Issue[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match lines like "- [CRITICAL] description" or "- [MAJOR] description"
    const tagMatch = trimmed.match(/^[-*]\s*\[(CRITICAL|MAJOR|MINOR)\]\s*(.+)/i);
    if (tagMatch) {
      const severity = tagMatch[1].toLowerCase() as Issue['severity'];
      const description = tagMatch[2].trim();
      const { file, line: lineNum } = extractFileRef(description);
      issues.push({ severity, description, file, line: lineNum });
    }
  }

  return issues.length > 0 ? issues : null;
}

function extractHeuristicIssues(text: string): Issue[] {
  const issues: Issue[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^[-*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      const content = trimmed.replace(/^[-*\d.)]+\s*/, '');
      if (content.length > 10) {
        const severity: Issue['severity'] =
          /critical|심각|보안/i.test(content) ? 'critical' :
          /major|주요|회귀|regression/i.test(content) ? 'major' : 'minor';

        const { file, line: lineNum } = extractFileRef(content);
        issues.push({ severity, description: content, file, line: lineNum });
      }
    }
  }

  return issues;
}

function extractIssues(text: string): Issue[] {
  // Priority 1: Structured "## Issues" section with severity tags
  const structured = extractStructuredIssues(text);
  if (structured) return structured;
  // Priority 2: Heuristic bullet-point extraction
  return extractHeuristicIssues(text);
}

function resolveAction(verdict: Verdict, iteration: number, maxIterations: number): Action {
  if (verdict === 'PASS') return 'complete';
  if (verdict === 'FAIL_CRITICAL') return 'escalate_to_user';
  if (iteration >= maxIterations) return 'escalate_to_user';
  if (verdict === 'FAIL_MINOR') return 'self_fix';
  return 're_analyze';
}

export async function kskReviewGateHandler(args: {
  review_text: string;
  iteration: number;
  max_iterations: number;
}) {
  try {
    const verdict = parseVerdict(args.review_text);
    const issues = extractIssues(args.review_text);
    const action = resolveAction(verdict, args.iteration, args.max_iterations);
    const remaining = args.max_iterations - args.iteration;

    const result = { verdict, issues, action, remaining_iterations: remaining, iteration: args.iteration };

    writeArtifact('review', JSON.stringify(result, null, 2), `review-gate-iter-${args.iteration}`);

    const actionGuide: Record<Action, string> = {
      complete: 'All checks passed. Task is complete.',
      self_fix: `Minor issues found. Fix them and re-review. (${remaining} iterations remaining)`,
      re_analyze: `Major issues found. Re-analyze with ksk_reason, then re-implement. (${remaining} iterations remaining)`,
      escalate_to_user: 'Critical issue or max iterations reached. Escalate to user for decision.',
    };

    const issueList = issues.length > 0
      ? '\n**Issues**:\n' + issues.map(i => {
          const loc = i.file ? ` (${i.file}${i.line ? `:${i.line}` : ''})` : '';
          return `- [${i.severity}] ${i.description}${loc}`;
        }).join('\n')
      : '';

    return {
      content: [{
        type: 'text' as const,
        text: [
          `## Review Gate`,
          `**Verdict**: ${verdict} | **Iteration**: ${args.iteration}/${args.max_iterations}`,
          `**Action**: ${action}`,
          `> ${actionGuide[action]}`,
          issueList,
        ].join('\n'),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_review_gate error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
