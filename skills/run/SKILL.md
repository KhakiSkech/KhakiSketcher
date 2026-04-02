---
name: run
description: Universal task entry point. Classifies tasks and routes through Think → Design → Build → Verify.
---

# KhakiSketcher Run

Universal entry point. Every task follows the Think → Design → Build → Verify workflow.

## Usage

```
/ksk:run <task description>
```

## Step 1: Classify

Read the task description and classify by intent:

| Keywords | Category | External Model? |
|----------|----------|----------------|
| debug/crash/race/intermittent | bugfix | Yes — Codex Think |
| architecture/refactor/restructure | architecture | Yes — Codex Think |
| UI/design/mockup/screenshot | ui | Yes — Codex Think + Gemini Design |
| visual-qa/compare/before-after | visual_qa | Yes — Gemini only |
| review/리뷰/검토 | code_review | Yes — Codex Think |
| implement/add/추가/구현 | implement | Maybe — Gemini Design if UI-related |
| test/테스트 | test | No |

## Step 2: Think — Codex (if complex)

For non-trivial tasks, call Codex for analysis:

```bash
codex exec "Analyze this task with maximum depth.

## Task
<task description>

## Context
<relevant file paths and error logs>

## Output Format (IMPORTANT)
1. Summary (2-3 sentences) — this is ALL Sonnet reads
2. Analysis Details — save to .ksk/artifact/think-<ts>.md
3. Implementation Plan (numbered steps)
4. Risk Assessment

## Output
<structured analysis with compact summary + detailed artifact>" --full-auto 2>/dev/null
```

Save result to `.ksk/artifact/` file. Sonnet reads ONLY the summary.

## Step 2.5: Design — Gemini (if UI-related)

If the task involves UI/visual changes, ask Gemini for design decisions:

```bash
gemini -p "@screenshot.png Design specification for this UI change:

1. Design tokens: colors, typography, spacing, border-radius
2. Component patterns: layout structure, hierarchy
3. UX Analysis: user flow, readability, accessibility
4. Visual hierarchy: what draws attention, information density

Output as:
- Summary (key decisions) — Sonnet reads this
- Full spec → save to .ksk/artifact/design-<ts>.md" -y --output-format text 2>/dev/null
```

Save result to `.ksk/artifact/` file. Sonnet reads ONLY the summary.

## Step 3: Build — Sonnet

Based on Think summary + Design summary (if applicable), implement directly.
- Read artifact files for detail when needed
- Sonnet writes ALL code

## Step 4: Verify

### Always: Codex logic review
```bash
codex exec "Review this implementation:

1. Does it match the implementation plan?
2. Logic correctness: edge cases, null safety, error paths
3. Performance: N+1, memory leaks, unnecessary re-renders
4. Security: injection, XSS, auth bypass
5. Regression risk: other code paths affected?

Verdict: PASS | FAIL_MINOR | FAIL_MAJOR | FAIL_CRITICAL

<diff and relevant context>" --full-auto 2>/dev/null
```

Save to `.ksk/artifact/`. Read verdict only.

### If UI: Gemini UX/Visual QA
```bash
gemini -p "@result.png @reference.png
UX and Visual QA:
1. Visual fidelity (0-100): does result match reference/design spec?
2. UX Quality: Is the flow intuitive? Any confusing elements?
3. Spacing/Alignment: Does it feel balanced? Visual weight correct?
4. Accessibility: WCAG contrast, target sizes
5. Polish: Any visual glitches, misalignment, text truncation?

Score: N/100 | Verdict: PASS(85+) / NEEDS_WORK / FAIL" -y --output-format text 2>/dev/null
```

## Verdict Handling

| Verdict | Action |
|--------|--------|
| PASS | Complete. Report results. |
| FAIL_MINOR | Sonnet self-fixes. Back to Step 3 (max 3 total loops) |
| FAIL_MAJOR | Report to user. Ask for direction. |
| FAIL_CRITICAL | Stop. Escalate to user. |

## Model Policy

- **Sonnet**: ALL code. Never delegates code writing.
- **Codex**: Analysis, planning, review ONLY. Read-only. Saves artifacts.
- **Gemini**: Design, UX analysis, visual QA ONLY. Read-only. Saves artifacts.

Task: {{ARGUMENTS}}
