import { z } from 'zod';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadSession } from '../session/store.js';

export const kskStatusSchema = {
  read_artifact: z.string().optional().describe('Artifact file path to read'),
  category: z.enum(['reason', 'vision', 'classify', 'review', 'all']).default('all').describe('Category filter for artifact listing'),
};

type ArtifactCategory = 'reason' | 'vision' | 'classify' | 'review';

const ARTIFACT_CATEGORIES: ArtifactCategory[] = ['reason', 'vision', 'classify', 'review'];
const ARTIFACT_BASE = '.ksk/artifacts';
const MAX_RECENT = 5;

interface ArtifactEntry {
  name: string;
  path: string;
  modified: Date;
}

function listArtifacts(category: ArtifactCategory, cwd: string): ArtifactEntry[] {
  const dir = join(cwd, ARTIFACT_BASE, category);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir);
    const entries: ArtifactEntry[] = [];
    for (const file of files) {
      const fullPath = join(dir, file);
      try {
        const stat = statSync(fullPath);
        if (stat.isFile()) {
          entries.push({ name: file, path: fullPath, modified: stat.mtime });
        }
      } catch {
        // Skip unreadable files
      }
    }
    return entries.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch {
    return [];
  }
}

function readArtifactContent(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function kskStatusHandler(args: {
  read_artifact?: string;
  category: 'reason' | 'vision' | 'classify' | 'review' | 'all';
}) {
  try {
    const cwd = process.cwd();

    // Mode 1: Read specific artifact
    if (args.read_artifact) {
      const content = readArtifactContent(args.read_artifact);
      if (content === null) {
        return {
          content: [{ type: 'text' as const, text: `Artifact not found: ${args.read_artifact}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `## Artifact: ${args.read_artifact}\n\n${content}` }],
      };
    }

    // Mode 2: List artifacts by category
    const categories: ArtifactCategory[] =
      args.category === 'all' ? ARTIFACT_CATEGORIES : [args.category as ArtifactCategory];

    const sections: string[] = ['## KSK Status'];

    // Session context
    const session = loadSession(cwd);
    sections.push('### Session Context');
    sections.push(`**Last Updated**: ${session.last_updated}`);
    if (session.last_classification) {
      const cls = session.last_classification;
      sections.push(`**Last Classification**: ${cls.primary.category} (composite: ${cls.is_composite})`);
      if (cls.subtasks && cls.subtasks.length > 0) {
        sections.push(`**Subtasks**: ${cls.subtasks.map(s => s.category).join(', ')}`);
      }
      sections.push(`**Execution Order**: ${cls.execution_order.join(' -> ')}`);
    }
    sections.push(`**Session Artifacts**: ${session.artifact_paths.length} tracked`);
    sections.push('');

    // Artifact listing
    sections.push('### Artifacts');
    for (const cat of categories) {
      const entries = listArtifacts(cat, cwd);
      const recent = entries.slice(0, MAX_RECENT);

      sections.push(`#### ${cat} (${entries.length} total)`);
      if (recent.length === 0) {
        sections.push('  (none)');
      } else {
        for (const entry of recent) {
          sections.push(`  - ${entry.name} (${entry.modified.toISOString().slice(0, 19)})`);
        }
        if (entries.length > MAX_RECENT) {
          sections.push(`  ... and ${entries.length - MAX_RECENT} more`);
        }
      }
      sections.push('');
    }

    return {
      content: [{ type: 'text' as const, text: sections.join('\n') }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_status error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
