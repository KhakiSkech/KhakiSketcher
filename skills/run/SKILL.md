---
name: run
description: Universal task entry point. Classifies tasks and routes to the appropriate specialist workflow. Trigger when user describes any coding task naturally.
---

# KhakiSketcher Run

Universal entry point for all KhakiSketcher workflows. Automatically classifies the task and routes to the optimal specialist skill.

## Usage

```
/ksk:run <task description>
```

## Workflow

You are the KhakiSketcher orchestrator. Follow these steps:

### Step 1: Classify
Call `ksk_classify` with the task description.

### Step 2: Route
Based on the classification result:

| Category | Action |
|----------|--------|
| `implement` | Proceed directly — Claude Sonnet implements, no external tools needed |
| `bugfix_simple` | Proceed directly — Claude Sonnet analyzes and fixes |
| `bugfix_complex` | Follow the **complex-debug** workflow below |
| `architecture` | Follow the **architecture** workflow below |
| `ui_redesign` | Follow the **ui-redesign** workflow below |
| `visual_qa` | Follow the **visual-qa** workflow below |
| `publishing_fix` | Follow the **ui-redesign** workflow (vision-guided) |

### Step 3: Execute the routed workflow

**For bugfix_complex:**
1. Use `ksk_reason` with effort="high" to analyze root cause
2. Implement the fix (Claude Sonnet)
3. Run tests
4. Use `ksk_reason` with effort="high" for regression review
5. Pass review through `ksk_review_gate` — loop if FAIL (max 3 iterations)

**For architecture:**
1. Use `ksk_reason` with effort="xhigh" for architectural analysis
2. Create implementation plan
3. Implement changes (consider using worktree isolation for large changes)
4. Run tests
5. Use `ksk_reason` with effort="high" for review
6. Pass through `ksk_review_gate` — loop if FAIL (max 3 iterations)

**For ui_redesign:**
1. Use `ksk_vision` with mode="analyze" on reference images/screenshots
2. Implement UI changes (Claude Sonnet)
3. Use `ksk_vision` with mode="qa" to verify visual quality
4. Loop if QA fails (max 3 iterations)

**For visual_qa:**
1. Use `ksk_vision` with mode="compare" on before/after screenshots
2. Return structured verdict (score, differences, suggestions)

## Model Policy (STRICT)
- **Claude Sonnet**: ALL code writing, editing, test execution
- **ksk_reason** (Codex/Gemini fallback): Analysis and review ONLY — never writes code
- **ksk_vision** (Gemini/Codex fallback): Visual analysis ONLY — never writes code

Task: {{ARGUMENTS}}
