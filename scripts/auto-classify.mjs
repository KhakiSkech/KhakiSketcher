#!/usr/bin/env node

/**
 * UserPromptSubmit Hook — Auto-classify & Smart Trigger
 *
 * Two-layer system:
 * Layer 1: Signal scoring — catches obvious patterns fast
 * Layer 2: Claude reads the injected routing policy and makes the final decision
 *
 * "개떡같이 말해도 찰떡같이 동작" = signal scoring + Claude's natural language understanding
 */

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || data.message || '').toLowerCase();

    if (!prompt || prompt.length < 3) {
      process.exit(0);
    }

    const result = classify(prompt);

    if (result) {
      // Write system-reminder text directly — Claude Code injects stdout as context
      process.stdout.write(result.reminder);
    }
  } catch {
    // Silent fail — don't block Claude Code
  }
});

function classify(prompt) {
  const signals = {
    // ── Architecture ──
    architecture: score(prompt, [
      [/설계|아키텍처|architecture/i, 4],
      [/리팩터|refactor|구조\s*변경|모듈\s*분리/i, 3],
      [/의존성.*정리|시스템.*설계|대규모.*변경/i, 3],
      [/마이그레이션|migration|모놀리스|마이크로서비스/i, 2],
      [/결합도|응집도|coupling|cohesion|SOLID/i, 2],
    ]),

    // ── Complex Debug ──
    complex_debug: score(prompt, [
      [/근본.*원인|root\s*cause|왜.*[안못].*[돼되]|원인.*파악/i, 4],
      [/크래시|crash|segfault|메모리.*릭|memory.*leak/i, 4],
      [/간헐적|intermittent|race\s*condition|동시성|deadlock/i, 3],
      [/stack\s*trace|traceback|exception.*at/i, 3],
      [/재현.*안|reproduce|깊[이은].*분석|심각한.*버그/i, 2],
    ]),

    // ── Simple Bug ──
    simple_bug: score(prompt, [
      [/버그|bug|오류|에러|고[쳐져]|수정|fix/i, 2],
      [/안\s*[돼되나]|깨[졌진]|잘못/i, 2],
      [/타입.*에러|TypeError|null|undefined/i, 1],
    ]),

    // ── UI Redesign ──
    ui_redesign: score(prompt, [
      [/UI|디자인|레이아웃|목업|mockup/i, 3],
      [/리디자인|redesign|화면.*[바만]|새.*디자인/i, 3],
      [/컴포넌트.*만들|스타일.*변경|CSS|tailwind/i, 2],
      [/반응형|responsive|모바일.*화면/i, 2],
      [/피그마|figma|스케치|sketch|XD/i, 2],
    ]),

    // ── Visual QA ──
    visual_qa: score(prompt, [
      [/비교해|compare|전후|before.*after/i, 3],
      [/스크린샷.*확인|visual.*qa|시각.*검증/i, 3],
      [/정렬|alignment|간격|spacing|pixel/i, 2],
      [/색상.*[일맞]|font.*[크사]/i, 2],
      [/\.png|\.jpg|\.webp|이미지.*확인/i, 2],
    ]),

    // ── Implementation ──
    implement: score(prompt, [
      [/만들어|구현|implement|개발해|작성해/i, 2],
      [/추가해|add|새.*기능|feature/i, 2],
      [/API|엔드포인트|라우트|컨트롤러/i, 1],
    ]),
  };

  // Find the top signal
  const entries = Object.entries(signals).sort((a, b) => b[1] - a[1]);
  const [topCategory, topScore] = entries[0];

  // Only trigger if score is above threshold (confident enough)
  if (topScore < 3) return null;

  const skillMap = {
    architecture: { skill: 'architecture', emoji: '🏗️', label: '아키텍처 분석' },
    complex_debug: { skill: 'complex-debug', emoji: '🔍', label: '복잡 디버깅' },
    simple_bug: null, // No special skill needed
    ui_redesign: { skill: 'ui-redesign', emoji: '🎨', label: 'UI 리디자인' },
    visual_qa: { skill: 'visual-qa', emoji: '👁️', label: '비주얼 QA' },
    implement: null, // No special skill needed
  };

  const mapping = skillMap[topCategory];
  if (!mapping) return null;

  return {
    category: topCategory,
    score: topScore,
    reminder: [
      `<system-reminder>`,
      `[KhakiSketcher Auto-Detect] ${mapping.emoji} This task looks like **${mapping.label}**.`,
      `Consider using the /ksk:${mapping.skill} workflow for optimal results.`,
      ``,
      `Available KhakiSketcher tools:`,
      `- ksk_reason: Deep reasoning (Codex/Gemini) for analysis and review`,
      `- ksk_vision: Visual analysis (Gemini/Codex) for screenshots and UI`,
      `- ksk_classify: Task classification and routing`,
      `- ksk_review_gate: Structured review verdicts with iteration loops`,
      `- ksk_context: Role-optimized context bundling`,
      `- ksk_status: View session artifacts and browse past results`,
      `</system-reminder>`,
    ].join('\n'),
  };
}

function score(text, rules) {
  let total = 0;
  for (const [pattern, weight] of rules) {
    if (pattern.test(text)) total += weight;
  }
  return total;
}

export default function() {}
