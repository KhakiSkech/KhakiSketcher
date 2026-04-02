# KhakiSketcher — Model Policy & Routing Rules

## Model Policy (HARD CONSTRAINTS — NEVER VIOLATE)

| Role | Model | Allowed Tasks |
|------|-------|---------------|
| **Code** | Claude Sonnet | Writing, editing, refactoring, testing, all file operations |
| **Reasoning** | `ksk_reason` → Codex/Gemini | Architecture analysis, complex debugging, code review, regression analysis |
| **Vision** | `ksk_vision` → Gemini | Screenshots, UI QA, design comparison, layout analysis |

**Claude Sonnet is a TEXT-ONLY coding engine in this project. Never analyze images directly — always use `ksk_vision`. If a user pastes an image, redirect them to provide a file path and use `ksk_vision` instead.**

---

## When to Call KhakiSketcher Tools

### `ksk_reason` — Deep external reasoning
Call when the problem requires **thinking beyond what you can reliably do alone**:
- Architecture decisions, SOLID violations, dependency analysis → `effort: xhigh`
- Root cause of crashes, race conditions, intermittent bugs → `effort: high`
- Code review before merge, regression risk assessment → `effort: medium`
- Quick feasibility check, option comparison → `effort: low`

### `ksk_vision` — Visual analysis (Gemini only)
Call whenever **images are involved**:
- UI screenshot analysis → `mode: analyze`
- Before/after comparison → `mode: compare`
- Pixel-perfect QA, spacing/contrast/grid → `mode: qa`
- Use `fast: true` for rapid iteration (Flash), `fast: false` for deep analysis (Pro)

### `ksk_classify` — When unsure which workflow to use
Returns a routing plan with provider assignments per phase.

### `ksk_review_gate` — After every external review
Always pipe `ksk_reason` review output through `ksk_review_gate` to get a structured `PASS/FAIL` verdict and `action`.

### `ksk_context` — Before calling `ksk_reason` or `ksk_vision`
Build role-optimized context bundles to give external models the right information.

### `ksk_status` — Check session state
Lists recent artifacts and last classification. Use when resuming a session or debugging tool outputs.

### `ksk_hud` — Session Dashboard
Call to see Codex/Gemini usage stats, artifact counts, and session info.

### `ksk_plan` — Auto-Discovery Planning
Use INSTEAD of `ksk_reason` when you don't know which files are relevant. Automatically finds related files.

---

## Natural Language → Tool Routing

Understand **intent**, not just keywords:

| User Says | Intent | Action |
|-----------|--------|--------|
| "이거 왜 안 돼?" / "에러나" | Bug — check complexity | Simple → fix directly; crash/race/intermittent → `ksk_reason(high)` |
| "구조가 이상해" / "리팩터" / "설계 다시" | Architecture | `ksk_reason(xhigh)` → implement → `ksk_review_gate` |
| "화면이 이상해" / "디자인 바꿔" / "목업대로" | UI/Visual | `ksk_vision(analyze)` → implement → `ksk_vision(qa)` |
| "비교해봐" / "전이랑 달라?" | Visual QA | `ksk_vision(compare)` |
| "만들어줘" / "추가해" / "구현해" | Implementation | Claude Sonnet directly — no external model needed |
| "리뷰해줘" / "문제없나" | Code review | `ksk_reason(medium)` → `ksk_review_gate` |
| "분석해줘" / "어떻게 할까?" | Depends | Code context → `ksk_reason`; image context → `ksk_vision` |

---

## Workflow Skills

Use these for complex multi-step tasks:
- `/ksk:run` — Auto-classify and route to the right workflow
- `/ksk:complex-debug` — Root cause analysis + fix + review loop (max 3 iterations)
- `/ksk:architecture` — Codex xhigh analysis + phased refactoring
- `/ksk:ui-redesign` — Gemini visual delta + implement + visual QA
- `/ksk:visual-qa` — Screenshot comparison + structured verdict
- `/ksk:code-review` — Deep code review with PASS/FAIL verdict

---

## Verification Rules

- After `ksk_reason` review output → always call `ksk_review_gate`
- `PASS` → complete; `FAIL_MINOR` → self-fix and re-review; `FAIL_MAJOR` → re-analyze; `FAIL_CRITICAL` → escalate to user
- Never claim a task complete without verification evidence
- Artifacts saved to `.ksk/artifacts/` — use `ksk_status` to browse them

---

## What NOT to Do

- ❌ Use Claude's built-in vision for any image analysis
- ❌ Write code with Codex (it reasons, Claude codes)
- ❌ Skip `ksk_review_gate` after an external review
- ❌ Ignore rate limit messages — surface them to the user with the 3 options provided
