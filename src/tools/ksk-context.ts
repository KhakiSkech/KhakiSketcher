import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { smartTruncate } from '../utils/truncate.js';

export const kskContextSchema = {
  role: z.enum(['reasoning', 'vision', 'implementation']).describe('Target role for context bundling'),
  task_description: z.string().describe('Task description for context relevance'),
  target_files: z.array(z.string()).optional().describe('Specific files to include'),
  include_git_diff: z.boolean().default(false).describe('Include git diff (staged + unstaged) in context'),
};

function getGitDiff(cwd: string): string | null {
  try {
    const diff = execSync('git diff HEAD --stat && echo "---" && git diff HEAD', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Intentional: git diff truncation uses simple front-cut; filepath error-line detection does not apply to diff output.
    return diff.length > 8000 ? diff.slice(0, 8000) + '\n...(truncated)' : diff;
  } catch {
    return null;
  }
}

function readFileSafe(path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function buildReasoningContext(description: string, files: string[]): string {
  const sections: string[] = [
    '# Context Bundle (Reasoning)',
    `## Task: ${description}`,
    '',
  ];

  if (files.length > 0) {
    sections.push('## Relevant Source Files');
    for (const file of files.slice(0, 10)) {
      const content = readFileSafe(file);
      if (content) {
        const truncated = smartTruncate(content, file, { maxChars: 3000 });
        sections.push(`### ${file}`, '```', truncated, '```', '');
      }
    }
  }

  sections.push(
    '## Analysis Guidelines',
    '- Focus on root cause, not symptoms',
    '- Consider dependency chains and side effects',
    '- Identify regression risks',
    '- Propose verifiable fixes',
  );

  return sections.join('\n');
}

function buildVisionContext(description: string, files: string[]): string {
  const sections: string[] = [
    '# Context Bundle (Vision)',
    `## Task: ${description}`,
    '',
  ];

  const cssFiles = files.filter(f => /\.(css|scss|less|styled|tailwind)/.test(f));
  if (cssFiles.length > 0) {
    sections.push('## Style Files');
    for (const file of cssFiles.slice(0, 5)) {
      const content = readFileSafe(file);
      if (content) {
        sections.push(`### ${file}`, '```css', smartTruncate(content, file, { maxChars: 2000 }), '```', '');
      }
    }
  }

  sections.push(
    '## Visual Analysis Guidelines',
    '- Check 8px grid alignment',
    '- Verify spacing consistency',
    '- Validate color token usage',
    '- Check WCAG 2.1 AA contrast ratios',
    '- Assess responsive breakpoint behavior',
  );

  return sections.join('\n');
}

function buildImplementationContext(description: string, files: string[]): string {
  return [
    '# Context Bundle (Implementation)',
    `## Task: ${description}`,
    '',
    `## Target Files: ${files.join(', ') || 'auto-detect'}`,
    '',
    '## Implementation Guidelines',
    '- Follow existing code patterns and conventions',
    '- Ensure immutability (create new objects, never mutate)',
    '- Keep functions small (<50 lines)',
    '- Handle errors at system boundaries',
    '- Run tests after changes',
  ].join('\n');
}

export async function kskContextHandler(args: {
  role: 'reasoning' | 'vision' | 'implementation';
  task_description: string;
  target_files?: string[];
  include_git_diff?: boolean;
}) {
  const files = args.target_files || [];

  const builders: Record<string, (desc: string, files: string[]) => string> = {
    reasoning: buildReasoningContext,
    vision: buildVisionContext,
    implementation: buildImplementationContext,
  };

  let context = builders[args.role](args.task_description, files);

  if (args.include_git_diff && args.role !== 'vision') {
    const diff = getGitDiff(process.cwd());
    if (diff) {
      context += '\n\n## Git Diff (Current Changes)\n```diff\n' + diff + '\n```';
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: context,
    }],
  };
}
