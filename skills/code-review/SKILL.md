# /ksk:code-review — Structured Code Review

Perform a deep, structured code review using Codex/Gemini reasoning + ksk_review_gate verdict.

## When to Use

- Reviewing a PR or diff before merge
- Checking code quality, logic correctness, and regression risk
- Getting a structured PASS/FAIL verdict with actionable issues

## Workflow

### Step 1 — Build Context

Identify what changed:
- Which files are being reviewed? (ask user or use recent git diff)
- What is the intent of the change?

Use `ksk_context` with `role: "reasoning"` and the relevant files.

### Step 2 — Deep Review via ksk_reason

Call `ksk_reason` with:
- `effort`: "medium" for style/logic review, "high" for security or regression risk
- `context_files`: the files under review
- `prompt`: structured review request including:
  - Logic correctness (off-by-one, null refs, race conditions)
  - Security (OWASP Top 10: injection, XSS, auth bypass)
  - Performance anti-patterns (N+1, unnecessary re-renders)
  - Code style and convention adherence
  - Test coverage relative to change surface
  - Output format: use `## Verdict: PASS|FAIL_MINOR|FAIL_MAJOR|FAIL_CRITICAL` and `## Issues` with `[CRITICAL]`/`[MAJOR]`/`[MINOR]` tags

### Step 3 — Parse Verdict via ksk_review_gate

Pass the review output to `ksk_review_gate`:
- `review_text`: the ksk_reason output
- `iteration`: current iteration (start at 1)
- `max_iterations`: 2 (review loops are short)

### Step 4 — Act on Verdict

| Verdict | Action |
|---------|--------|
| PASS | Report clean review to user. Done. |
| FAIL_MINOR | List issues. Claude self-fixes if authorized. Re-review once. |
| FAIL_MAJOR | List issues with suggested fixes. Escalate to user for decision. |
| FAIL_CRITICAL | Immediately escalate. Do NOT proceed with merge/commit. |

## Output Format

Always conclude with:

```
## Code Review Summary
**Verdict**: [PASS|FAIL_*]
**Issues found**: N
**Recommendation**: [merge-ready | fix-minor-then-merge | requires-rework | escalate]

[Issue list if any]
```

## Notes

- Do NOT modify code during review — this skill is read-only analysis
- If files are large, focus on the diff surface, not the entire file
- For PRs: prefer `git diff main...HEAD` as context
