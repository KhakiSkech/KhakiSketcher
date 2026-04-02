---
name: architecture
description: Architecture analysis and large-scale refactoring with Codex reasoning. Use for system design, module restructuring, migration planning.
---

# Architecture

Deep architectural analysis: Think (Codex analysis) → Build (phased refactor) → Verify (review).

## Usage

```
/ksk:architecture <architecture task or refactoring goal>
```

## Phase 1: Think — Codex Architectural Analysis

Gather context (modules, dependencies, entry points), then call Codex:

```bash
codex exec "Analyze this architecture with maximum depth.

## Context
<list key files, module boundaries, dependency graph>

## Analyze
1. Coupling/cohesion metrics (afferent/efferent coupling)
2. Circular dependencies
3. SOLID principle violations
4. Blast radius of proposed changes
5. Migration strategy (Strangler Fig / Branch by Abstraction / Direct)
6. Phased implementation plan (least dependent first)

## Output Format (IMPORTANT)
1. Summary (2-3 sentences) — this is ALL Sonnet reads
2. Detailed Analysis → save to .ksk/artifact/arch-<ts>.md
3. Implementation Plan (numbered phases, each independently verifiable)
4. Risk Assessment (what could break, rollback strategy)" --full-auto 2>/dev/null
```

Save result to `.ksk/artifact/arch-<ts>.md`. Sonnet reads ONLY the summary.

Fallback: `gemini -p "..." -y --output-format text 2>/dev/null`

## Phase 2: Build — Sonnet Phased Implementation

Based on the Think summary + implementation plan:
- Read artifact file for detailed analysis when needed
- Execute phases in dependency order (least dependent first)
- One phase at a time, run tests after each
- Use worktree isolation for large changes
- Mark high-risk phases needing extra review

## Phase 3: Verify — Codex Review (max 3 rounds)

```bash
codex exec "Review this architectural change:

1. Does the result match the intended architecture?
2. Are coupling metrics improved?
3. Unintended side effects?
4. Are tests still passing?

## Output Format (IMPORTANT)
1. Summary (verdict only) — PASS | FAIL
2. Details → save to .ksk/artifact/arch-review-<ts>.md

<paste the diff>" --full-auto 2>/dev/null
```

Save to `.ksk/artifact/`. Read verdict only.

- PASS → Complete
- FAIL → Fix specific issues, re-verify (max 3 loops)

Task: {{ARGUMENTS}}
