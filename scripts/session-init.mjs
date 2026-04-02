#!/usr/bin/env node

/**
 * SessionStart Hook — Provider detection + Routing policy injection
 *
 * This is Layer 2 of the "찰떡같이 동작" system:
 * Injects comprehensive routing rules into Claude's context so that
 * Claude Sonnet ITSELF becomes the intelligent natural-language classifier.
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
  if (hasCodex) providers.push('Codex ✓');
  else providers.push('Codex ✗ (fallback to Gemini for reasoning)');
  if (hasGemini) providers.push('Gemini ✓');
  else providers.push('Gemini ✗ (fallback to Codex for vision)');

  const fallbackNote = (!hasCodex || !hasGemini)
    ? `\n⚠️ Fallback active: ${!hasCodex ? 'Gemini handles reasoning.' : ''} ${!hasGemini ? 'Codex handles vision.' : ''}`
    : '';

  const reminder = [
    `<system-reminder>`,
    `[KhakiSketcher v0.1] Policy-driven multi-model orchestrator active.`,
    `Providers: ${providers.join(' | ')}${fallbackNote}`,
    ``,
    `## Model Policy (STRICT)`,
    `- **Claude Sonnet**: ALL code writing, editing, test execution, implementation`,
    `- **ksk_reason**: Deep reasoning via Codex/Gemini — architecture, complex debug, regression review`,
    `- **ksk_vision**: Visual analysis via Gemini/Codex — screenshots, UI QA, design comparison`,
    ``,
    `## When to Use KhakiSketcher Tools`,
    `Use your judgment based on the user's natural language:`,
    ``,
    `| User Intent | Tool | Examples |`,
    `|-------------|------|----------|`,
    `| Deep analysis/architecture | ksk_reason(xhigh) | "설계해줘", "구조 분석", "리팩터 전략", "architecture" |`,
    `| Complex debugging | ksk_reason(high) | "왜 안돼", "크래시 원인", "root cause", "간헐적 에러" |`,
    `| Code review | ksk_reason(medium) | "리뷰해줘", "검토해봐", "문제 없나", "regression check" |`,
    `| UI/Visual analysis | ksk_vision(analyze) | "디자인 분석", "목업 보고", "UI 비교", "레이아웃 확인" |`,
    `| Screenshot comparison | ksk_vision(compare) | "비교해줘", "전후 비교", "달라진 점", "before/after" |`,
    `| Visual QA | ksk_vision(qa) | "QA해줘", "정렬 확인", "간격 맞나", "pixel perfect" |`,
    `| Task classification | ksk_classify | When unsure which workflow to use |`,
    `| Review verification | ksk_review_gate | After any review to get structured PASS/FAIL verdict |`,
    ``,
    `## Workflow Skills Available`,
    `- /ksk:run — Auto-classify and route to the right workflow`,
    `- /ksk:complex-debug — Codex root-cause analysis + iterative fix-review loop`,
    `- /ksk:architecture — Codex xhigh analysis + phased refactoring`,
    `- /ksk:ui-redesign — Gemini visual delta + implementation + visual QA`,
    `- /ksk:visual-qa — Gemini screenshot comparison + structured verdict`,
    ``,
    `## Natural Language Routing Guide`,
    `You don't need slash commands. Understand the user's INTENT:`,
    `- "이거 왜 이래?" / "안 돼" / "에러 나" → Bug. Simple? Fix directly. Complex (crash, race condition)? Use ksk_reason.`,
    `- "구조가 이상해" / "리팩터" / "설계 다시" → Architecture. Use ksk_reason(xhigh).`,
    `- "화면 이상해" / "디자인 바꿔" / "목업대로" → UI. Use ksk_vision.`,
    `- "비교해봐" / "전이랑 달라?" → Visual QA. Use ksk_vision(compare).`,
    `- "만들어줘" / "추가해" / "구현해" → Implementation. Claude Sonnet directly.`,
    `- "분석해줘" / "어떻게 할까" / "추천해줘" → Depends on context. Code? ksk_reason. Visual? ksk_vision.`,
    `</system-reminder>`,
  ].join('\n');

  // Write system-reminder text directly — Claude Code injects stdout as context
  process.stdout.write(reminder);
});

export default function() {}
