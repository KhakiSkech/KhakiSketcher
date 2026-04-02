<h1 align="center">KhakiSketcher</h1>

<p align="center">
  <strong>Policy-driven multi-model orchestration for AI coding</strong><br>
  Route tasks between Claude, Codex, Gemini — or swap in GLM — with one command.
</p>

<p align="center">
  <a href="https://github.com/KhakiSketch/KhakiSketcher/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-green.svg" alt="Node.js >=20">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="Claude Code Plugin">
</p>

---

## Why We Built This

We're [KhakiSketch](https://khakisketch.co.kr/) — a two-person dev studio in Cheongju, Korea. We ship production apps every day using AI coding tools, and we kept hitting the same wall:

**One model can't do everything well.**

Claude writes great code but can't see screenshots. Codex reasons deeply about architecture but shouldn't touch files. Gemini sees pixels perfectly but needs a coder beside it. And every project has different constraints — budget, latency, compliance — that dictate which model you reach for.

So we built KhakiSketcher: a **routing policy layer** that sits between you and your models, automatically sending each task to the right brain.

The architecture is intentionally provider-agnostic. Today it ships with Claude + Codex + Gemini. Tomorrow, **GLM can replace Claude** as the coding engine with zero changes to your workflow. Models are a commodity — your prompts and verification loops are the product.

---

## How It Works

```
You type a task
       |
       v
  KhakiSketcher classifies it
       |
       v
  Routes to the right model:
       |
       +-- "Add a login page"     --> Claude Sonnet (code)
       +-- "Why is this crashing?" --> Codex / Gemini (reasoning)
       +-- "UI looks off"         --> Gemini (vision)
       |
       v
  Results flow back with:
  - Automatic fallback if a provider is down
  - Rate-limit retry with the alternate provider
  - Structured review gates (PASS / FAIL)
  - Session tracking and artifacts
```

**Every workflow includes a verification loop** — analyze, implement, test, review — so you don't ship broken code.

---

## Quick Start

### Prerequisites

- [Claude Code](https://claude.ai/code) CLI
- Node.js >= 20

### Install

```bash
# From GitHub
claude plugin marketplace add https://github.com/KhakiSketch/KhakiSketcher
claude plugin install khaki-sketcher
```

Or from source:

```bash
git clone https://github.com/KhakiSketch/KhakiSketcher.git
cd KhakiSketcher
npm install
npm run build
claude plugin install .
```

### Optional Providers

KhakiSketcher detects what's available at session start and adapts automatically.

| Provider | Install | Enables |
|----------|---------|---------|
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | Deep reasoning (architecture, debugging, review) |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @anthropic-ai/gemini` | Vision analysis (screenshots, UI QA, design comparison) |

No Codex? Gemini Pro handles reasoning. No Gemini? Codex handles vision. Neither? Everything falls back gracefully.

---

## MCP Tools

Eight tools that give Claude Code superpowers:

| Tool | What It Does |
|------|-------------|
| `ksk_reason` | Deep reasoning via Codex (fallback: Gemini Pro). Configurable effort: low → xhigh |
| `ksk_vision` | Image analysis via Gemini. Modes: analyze, compare, qa. Flash for speed, Pro for depth |
| `ksk_classify` | Analyzes your prompt and returns a routing plan with provider assignments per phase |
| `ksk_plan` | Auto-discovers relevant files by keyword, then reasons over them |
| `ksk_review_gate` | Parses review output into structured PASS/FAIL verdicts with action items |
| `ksk_context` | Builds role-optimized context bundles (reasoning, vision, implementation) |
| `ksk_status` | Shows session state, recent artifacts, and provider availability |
| `ksk_hud` | Session dashboard: provider stats, artifact counts, duration |

---

## Skills — One Command, Full Workflow

| Skill | Command | What Happens |
|-------|---------|-------------|
| **Run** | `/ksk:run "your task"` | Auto-classify and route to the right workflow |
| **Complex Debug** | `/ksk:complex-debug` | Root cause analysis → fix → test → review loop |
| **Architecture** | `/ksk:architecture` | Deep analysis → phased refactoring with verification |
| **UI Redesign** | `/ksk:ui-redesign` | Visual delta → implement → visual QA loop |
| **Visual QA** | `/ksk:visual-qa` | Screenshot comparison with structured verdict |
| **Code Review** | `/ksk:code-review` | Deep review with PASS/FAIL gate |
| **Test** | `/ksk:test` | Strategy → write → run → analyze → cover gaps |

Every skill runs a **verification loop** (max 3 iterations): analyze → implement → test → review. If review fails, it loops back. If it fails critically or exhausts iterations, it escalates to you.

---

## Agents — Domain Expertise on Demand

| Agent | Specialty |
|-------|-----------|
| `architect` | Coupling/cohesion analysis, SOLID violations, migration strategy |
| `debugger` | 5-Whys root cause, bisection debugging, hypothesis testing |
| `vision-analyst` | Grid layout validation, spacing measurement, WCAG contrast checks |
| `code-reviewer` | Logic defects, OWASP Top 10, N+1 detection, regression risk |
| `test-engineer` | Boundary analysis, coverage gaps, regression test selection |
| `performance-engineer` | N+1 queries, memory leaks, bundle size profiling |
| `doc-writer` | README, API docs, changelog generation |
| `router` | Task classification and routing (lightweight, always-on) |

Each agent comes with domain-specific prompts encoding real debugging and review frameworks — not generic instructions.

---

## Hooks — Automatic Intelligence

| Hook | When | What |
|------|------|------|
| `auto-classify` | You submit a prompt | Detects intent, suggests the right skill |
| `session-init` | Session starts | Detects available CLIs, builds provider map |
| `security-guard` | Before Bash/Write/Edit | Blocks `rm -rf /`, `DROP TABLE`, force push |
| `post-tool-track` | After file edits | Tracks what files changed in-session |
| `pre-compact` | Before context compression | Preserves session state to disk |

---

## Natural Language Routing

Just talk. KhakiSketcher understands intent:

| You say... | Routes to |
|------------|-----------|
| "Why is this crashing?" | `ksk_reason` (high effort) |
| "Refactor the architecture" | `ksk_reason` (xhigh effort) |
| "UI looks wrong" | `ksk_vision` (analyze) |
| "Compare before/after" | `ksk_vision` (compare) |
| "Add a login feature" | Claude Sonnet directly |
| "Review this code" | `ksk_reason` + `ksk_review_gate` |

---

## Model Policy

| Role | Primary | Fallback | Tasks |
|------|---------|----------|-------|
| **Code** | Claude Sonnet | GLM (pluggable) | Writing, editing, refactoring, testing |
| **Reasoning** | Codex CLI | Gemini Pro | Architecture, debugging, code review |
| **Vision** | Gemini CLI | Codex CLI | Screenshots, UI QA, design comparison |

Claude Sonnet operates as a text-only coding engine. All image analysis is delegated to Gemini via `ksk_vision`.

**Provider swap is by design.** The architecture uses a provider abstraction layer — `codex-runner` and `gemini-runner` are interchangeable modules behind a common interface. Replacing Claude with GLM (or any other coding model) requires implementing one runner, not rewriting the orchestration logic.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KSK_GEMINI_PRO_MODEL` | `gemini-2.5-pro` | Gemini model for reasoning/vision |
| `KSK_GEMINI_FLASH_MODEL` | `gemini-2.0-flash` | Gemini Flash for rapid vision iteration |
| `KSK_CODEX_TIMEOUT` | `120000` | Codex CLI timeout in ms |

### Session State

KhakiSketcher maintains session state in `.ksk/` within your project:
- `session.json` — Atomic writes for crash safety
- `artifacts/` — Reasoning results, vision reports, review verdicts

---

## Architecture

```
KhakiSketcher/
  .claude-plugin/plugin.json     Plugin metadata
  .mcp.json                      MCP server config
  hooks/hooks.json               Hook definitions
  agents/                        8 agent definitions
  skills/                        7 skill workflows
  scripts/                       Hook scripts (auto-classify, security, tracking)
  src/
    tools/                       8 MCP tool handlers
    providers/                   Provider abstraction (codex-runner, gemini-runner)
    classify/                    Task classification engine
    session/                     Session state management (atomic writes)
    artifacts/                   Artifact persistence
    utils/                       Shared utilities (smart truncation)
  bridge/mcp-server.cjs          Built MCP server (esbuild)
```

### Design Principles

1. **Models are interchangeable** — Provider abstraction means any LLM can fill any role
2. **Prompts are the product** — Domain expertise is encoded in agent prompts, not hardcoded
3. **Verification is mandatory** — No workflow completes without a review gate
4. **Graceful degradation** — Missing providers trigger automatic fallback, never crashes
5. **Smart context** — Error-line-aware truncation preserves the information that matters

---

## Development

```bash
npm install              # Install dependencies
npm run build            # Build MCP server bundle (esbuild)
npm test                 # Run 35 unit tests
npm run test:typecheck   # TypeScript type check
npm run dev              # Watch mode rebuild
```

---

## About KhakiSketch

Built by [KhakiSketch](https://khakisketch.co.kr/) — a two-person CS-major dev studio in Cheongju, Korea. We build startup MVPs, business automation systems, and production apps with Next.js, React, TypeScript, Python, FastAPI, PostgreSQL, Flutter, and Supabase.

KhakiSketcher was born from our daily work. Every routing rule, every review gate, every agent prompt comes from real debugging sessions and production incidents — not theoretical exercises. We open-sourced it because we believe the best orchestration patterns should be shared, improved, and adapted by the community.

---

## License

[MIT](LICENSE) — Use it, fork it, improve it. Just keep the copyright notice.

---

<p align="center">
  <a href="https://khakisketch.co.kr/">khakisketch.co.kr</a> · <a href="https://github.com/KhakiSketch">GitHub</a>
</p>
