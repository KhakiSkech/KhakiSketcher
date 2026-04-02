import { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ARTIFACT_DIR = '.ksk/artifacts';
const MAX_ARTIFACTS_PER_CATEGORY = 50;

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function pruneOldArtifacts(dir: string): void {
  try {
    const files = readdirSync(dir)
      .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length > MAX_ARTIFACTS_PER_CATEGORY) {
      files.slice(MAX_ARTIFACTS_PER_CATEGORY).forEach(f => {
        try { unlinkSync(join(dir, f.name)); } catch { /* ignore */ }
      });
    }
  } catch { /* ignore */ }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function writeArtifact(
  category: 'reason' | 'vision' | 'classify' | 'review',
  content: string,
  description: string,
  cwd?: string,
): string {
  const base = cwd || process.cwd();
  const dir = join(base, ARTIFACT_DIR, category);
  ensureDir(dir);

  const slug = generateSlug(description);
  const filename = `${slug}-${timestamp()}.md`;
  const filepath = join(dir, filename);

  const header = [
    '---',
    `category: ${category}`,
    `description: ${description}`,
    `created: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');

  writeFileSync(filepath, header + content, 'utf-8');
  pruneOldArtifacts(dir);
  return filepath;
}
