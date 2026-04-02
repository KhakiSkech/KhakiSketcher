---
name: complex-debug
description: Complex debugging with Codex root-cause analysis and iterative review loop. Use for crashes, race conditions, intermittent failures, and deep bugs.
---

# Complex Debug

Systematic debugging workflow with deep reasoning analysis, iterative fix-review loops, and regression verification.

## Usage

```
/ksk:complex-debug <bug description, error message, or symptoms>
```

## Workflow

### Phase 1: Root Cause Analysis
1. Gather context: read error logs, stack traces, relevant source files
2. Call `ksk_context` with role="reasoning" and relevant file paths
3. Call `ksk_reason` with effort="high":
   - Apply 5-Whys methodology
   - Generate competing hypotheses
   - Identify evidence for/against each hypothesis
   - Determine root cause

### Phase 2: Implementation
4. Based on the root-cause analysis, implement the fix
   - Touch ONLY what is necessary to fix the root cause
   - Do NOT refactor adjacent code
   - Match existing code style

### Phase 3: Test
5. Run existing tests to verify the fix doesn't break anything
6. Write a new test that reproduces the original bug and confirms the fix

### Phase 4: Review (iterative, max 3 rounds)
7. Call `ksk_reason` with effort="high" for regression review:
   - Does the fix address the root cause (not just the symptom)?
   - Are there other code paths with the same vulnerability?
   - Does the fix introduce any new edge cases?
8. Pass the review through `ksk_review_gate`:
   - **PASS** → Complete. Report results.
   - **FAIL_MINOR** → Apply suggested fixes, re-run tests, re-review
   - **FAIL_MAJOR** → Return to Phase 1 with new information
   - **FAIL_CRITICAL** → Stop and escalate to user

## Model Policy
- Analysis (Phase 1, 4): `ksk_reason` (Codex → Gemini fallback)
- Implementation (Phase 2): Claude Sonnet ONLY
- Tests (Phase 3): Claude Sonnet ONLY

Task: {{ARGUMENTS}}
