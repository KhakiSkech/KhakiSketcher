# KhakiSketcher

Policy-driven multi-model orchestration plugin for [Claude Code](https://claude.ai/code).

Routes tasks between **Claude Sonnet** (coding), **Codex CLI** (reasoning), and **Gemini CLI** (vision) with automatic classification, provider fallback, and session tracking.

## Features

- **Auto-Classification** -- Analyzes user prompts to route to the right model and workflow
- **Multi-Provider Fallback** -- Codex unavailable? Falls back to Gemini. Both down? Graceful degradation
- **Rate Limit Handling** -- Auto-retries with the alternate provider on rate limit errors
- **Session HUD** -- Real-time stats on provider usage, artifacts, and session duration
- **Security Hooks** -- Blocks dangerous commands (`rm -rf /`, `DROP TABLE`, force push)
- **Review Gate** -- Structured PASS/FAIL verdicts from external reviews
- **Context Bundling** -- Builds role-optimized context bundles for each provider

## MCP Tools

| Tool | Description |
|------|-------------|
| `ksk_reason` | Deep reasoning via Codex/Gemini with configurable effort levels |
| `ksk_vision` | Image analysis via Gemini (Pro/Flash) with `@file` support |
| `ksk_classify` | Classify a task description into workflow categories |
| `ksk_review_gate` | Parse external review output into structured verdict + action |
| `ksk_context` | Build context bundles (reasoning, vision, implementation roles) |
| `ksk_status` | Show session state, recent artifacts, and provider info |
| `ksk_hud` | Display provider stats table, artifact counts, session duration |
| `ksk_plan` | Auto-discover relevant files by keyword, then plan via reasoning |

## Agents

| Agent | Role |
|-------|------|
| `router` | Default agent -- classifies and routes tasks |
| `architect` | Architecture analysis and design review |
| `code-reviewer` | Code review with severity-rated feedback |
| `debugger` | Root cause analysis and crash investigation |
| `test-engineer` | Test strategy and coverage |
| `vision-analyst` | UI/UX visual analysis via Gemini |
| `performance-engineer` | N+1, memory leak, bundle size profiling |
| `doc-writer` | README, API docs, changelog |

## Skills

```
/ksk:run             Auto-classify and route to the right workflow
/ksk:complex-debug   Root cause analysis + fix + review loop
/ksk:architecture    Codex xhigh analysis + phased refactoring
/ksk:ui-redesign     Gemini visual delta + implement + visual QA
/ksk:visual-qa       Screenshot comparison + structured verdict
/ksk:code-review     Deep code review with PASS/FAIL verdict
/ksk:test            Strategy -> write -> run -> analyze -> cover gaps
```

## Hooks

| Hook | Script | Purpose |
|------|--------|---------|
| `UserPromptSubmit` | `auto-classify.mjs` | Injects tool routing reminder |
| `SessionStart` | `session-init.mjs` | Detects available providers |
| `PreToolUse` | `security-guard.mjs` | Blocks dangerous commands |
| `PostToolUse` | `post-tool-track.mjs` | Tracks file edits |
| `PreCompact` | `pre-compact.mjs` | Preserves session state before context compression |

## Install

### Prerequisites

- [Claude Code](https://claude.ai/code) CLI
- Node.js >= 20
- (Optional) [Codex CLI](https://github.com/openai/codex) for reasoning
- (Optional) [Gemini CLI](https://github.com/google-gemini/gemini-cli) for vision/reasoning fallback

### Via Claude Code Plugin Marketplace

```bash
claude plugin marketplace add https://github.com/KhakiSketch/KhakiSketcher
claude plugin install khaki-sketcher
```

### From Source

```bash
git clone https://github.com/KhakiSketch/KhakiSketcher.git
cd KhakiSketcher
npm install
npm run build
claude plugin install .
```

## Model Policy

| Role | Model | Tasks |
|------|-------|-------|
| **Code** | Claude Sonnet | Writing, editing, refactoring, testing |
| **Reasoning** | Codex / Gemini | Architecture, debugging, code review |
| **Vision** | Gemini | Screenshots, UI QA, design comparison |

Claude Sonnet operates as a text-only coding engine. All image analysis is delegated to Gemini via `ksk_vision`.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KSK_GEMINI_PRO_MODEL` | `gemini-2.5-pro` | Gemini model for reasoning/vision |
| `KSK_GEMINI_FLASH_MODEL` | `gemini-2.0-flash` | Gemini Flash for rapid vision iteration |
| `KSK_CODEX_TIMEOUT` | `120000` | Codex CLI timeout in ms |

### Natural Language Routing

| You say... | Routes to |
|------------|-----------|
| "Why is this crashing?" | `ksk_reason` (high effort) |
| "Refactor the architecture" | `ksk_reason` (xhigh effort) |
| "UI looks wrong" | `ksk_vision` (analyze) |
| "Compare before/after" | `ksk_vision` (compare) |
| "Add a login feature" | Claude Sonnet directly |
| "Review this code" | `ksk_reason` + `ksk_review_gate` |

## Development

```bash
npm install          # Install dependencies
npm run build        # Build MCP server bundle
npm test             # Run unit tests (35 tests)
npm run test:typecheck  # TypeScript type check
npm run dev          # Watch mode rebuild
```

## Project Structure

```
KhakiSketcher/
  .claude-plugin/plugin.json   Plugin metadata
  .mcp.json                    MCP server config
  hooks/hooks.json             Hook definitions
  agents/                      8 agent definitions
  skills/                      7 skill workflows
  scripts/                     Hook scripts
  src/                         TypeScript source
    tools/                     MCP tool handlers
    providers/                 Codex/Gemini provider runners
    classify/                  Task classification engine
    session/                   Session state management
    artifacts/                 Artifact writer
    utils/                     Shared utilities
  bridge/mcp-server.cjs        Built MCP server (esbuild)
```

## License

MIT
