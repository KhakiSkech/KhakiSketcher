#!/usr/bin/env node
// PreCompact hook — injects session summary before context compression

import { readFileSync, existsSync } from 'node:fs';

const SESSION_FILE = '.ksk/session.json';

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    if (!existsSync(SESSION_FILE)) { process.exit(0); return; }
    const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));

    const cls = session.last_classification;
    const stats = session.provider_stats;

    const reminder = [
      '<system-reminder>',
      '[KhakiSketcher Session State — preserved across context compression]',
      '',
      cls ? `Last Task: ${cls.primary.category} (confidence: ${cls.primary.confidence})` : '',
      `Codex calls: ${stats?.codex?.call_count ?? 0} | Gemini calls: ${stats?.gemini?.call_count ?? 0}`,
      `Session artifacts: ${session.artifact_paths?.length ?? 0} tracked`,
      '',
      'Use ksk_status to browse artifacts or ksk_hud for full session dashboard.',
      '</system-reminder>',
    ].filter(Boolean).join('\n');

    process.stdout.write(reminder);
  } catch {
    // silent fail
  }
});

export default function() {}
