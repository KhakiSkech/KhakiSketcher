#!/usr/bin/env node

/**
 * SessionStart Hook — CLI detection + lightweight routing policy
 *
 * Detects Codex/Gemini CLI availability, injects minimal policy reminder.
 * No MCP tools — Skills call CLI directly via Bash.
 */

import { execSync } from 'node:child_process';

function detectCli(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const hasCodex = detectCli('codex');
  const hasGemini = detectCli('gemini');

  const providers = [];
  if (hasCodex) providers.push('Codex');
  if (hasGemini) providers.push('Gemini');

  const providerNote = providers.length > 0
    ? providers.join(' + ')
    : 'NONE (install codex or gemini CLI)';

  const reminder = [
    `<system-reminder>`,
    `[KhakiSketcher v0.2] CLI-native orchestrator. Providers: ${providerNote}`,
    ``,
    `## Model Policy`,
    `- Claude Sonnet = ALL code (write, edit, test, implement)`,
    `- Codex CLI = reasoning (architecture, debug, review) via \`codex exec\``,
    `- Gemini CLI = vision (screenshots, UI QA) via \`gemini -p\``,
    ``,
    `## Routing (keyword → skill)`,
    `- debug/crash/race condition → /ksk:complex-debug`,
    `- architecture/refactor/restructure → /ksk:architecture`,
    `- UI/redesign/mockup/screenshot → /ksk:ui-redesign`,
    `- visual-qa/compare/before-after → /ksk:visual-qa`,
    `- review/리뷰/검토 → /ksk:code-review`,
    `- implement/add/추가 → Claude Sonnet directly`,
    ``,
    `## Skills`,
    `/ksk:run | /ksk:complex-debug | /ksk:architecture | /ksk:ui-redesign | /ksk:visual-qa | /ksk:code-review | /ksk:test`,
    `</system-reminder>`,
  ].join('\n');

  process.stdout.write(reminder);
});

export default function() {}
