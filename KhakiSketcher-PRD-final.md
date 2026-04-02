# KhakiSketcher PRD
Version: v1.0 (Final)  
Status: Approved Draft  
Owner: KhakiSketch  
Product: **KhakiSketcher**

---

## 1. Product Overview

**KhakiSketcher** is a **tmux-first, local-first orchestration runtime** for coding workflows centered on **Claude Code**, with **Codex CLI** used for high-difficulty engineering reasoning and **Gemini** used for visual analysis workflows.

The system is designed around a strict operational policy:

- **Claude Code is the primary cockpit**
- **Claude uses Sonnet only**
- **Codex replaces Opus-style high-cost deep reasoning**
- **Gemini handles visual and design-heavy tasks**
- **tmux is a core runtime layer, not an optional convenience**
- **Session durability, observability, and recoverability are first-class requirements**

KhakiSketcher is not a generic multi-model playground. It is a **policy-driven engineering orchestrator** optimized for real software development execution.

---

## 2. Problem Statement

Modern coding agents have uneven strengths:

- General implementation is efficient in Claude Sonnet
- Deep architecture, root-cause analysis, and broad refactor planning consume disproportionate high-end model budget
- Visual comparison, UI redesign, and publishing QA require image-capable models
- Manual switching between tools causes context loss, fragmented outputs, inconsistent review paths, and poor reproducibility

The team wants a system where:

1. **Claude Sonnet remains the default implementation engine**
2. **Codex handles the “Opus-class” reasoning burden without using Opus**
3. **Gemini handles vision-heavy workflows**
4. **All long-running worker sessions are stable, resumable, and inspectable**
5. **tmux is used as the durable execution substrate**

---

## 3. Product Goals

KhakiSketcher must:

1. Provide a **single orchestration layer** for Claude Code, Codex CLI, and Gemini workflows
2. Use **Claude Sonnet only** for default implementation, editing, and execution tasks
3. Route high-difficulty engineering analysis to **Codex**
4. Route visual and design tasks to **Gemini**
5. Make **tmux-based session execution** the default runtime model
6. Support **session recovery, progress tracking, and artifact persistence**
7. Isolate actual repo mutations inside **git worktrees**
8. Enforce **approval gates** for destructive or high-risk actions

---

## 4. Non-Goals

KhakiSketcher does **not** aim to be:

- A SaaS platform
- A browser-first agent product
- A fully autonomous deployment system
- A generic LLM chat router
- A model benchmarking suite
- A replacement for Claude Code itself

KhakiSketcher is specifically a **developer-controlled orchestration runtime**.

---

## 5. Target Users

Primary users:

- Developers already using **Claude Code** as a main coding workflow
- Engineers who want to reduce or avoid **Opus usage**
- Teams doing both **implementation** and **visual UI work**
- Advanced users comfortable with **CLI, tmux, git worktree, and structured automation**

Secondary users:

- Small engineering teams that want durable, inspectable local agent workflows
- Operator-style developers who want a persistent multi-session coding runtime

---

## 6. Core Product Principles

### 6.1 Claude-first
All user-facing coding workflows begin from the Claude Code path.

### 6.2 Sonnet-only for implementation consistency
Claude within KhakiSketcher uses **Sonnet only**. No Opus, no Haiku switching.

### 6.3 Codex as the deep engineering escalator
Codex handles difficult reasoning tasks that would otherwise pressure premium Claude usage.

### 6.4 Gemini for vision only
Gemini is not a general fallback coder. It is a **vision specialist** in the runtime.

### 6.5 tmux-first runtime
tmux is a **core execution substrate** used to maintain persistent worker sessions, not merely a convenience.

### 6.6 Worktree isolation
Each active session operates on an isolated git worktree.

### 6.7 Structured handoff
Workers do not free-form chat with each other. They hand off via structured JSON artifacts and metadata.

---

## 7. High-Level Architecture

```text
Developer
  -> Claude Code
      -> KhakiSketcher
          -> Task Classifier
          -> Policy Router
          -> Context Builder
          -> Approval Gate
          -> Session Manager
              -> tmux Runtime
                  -> Claude Sonnet Worker
                  -> Codex Worker
                  -> Gemini Pro Worker
                  -> Gemini Flash Worker
          -> Worktree Manager
          -> Artifact Store
          -> Event Log
          -> Progress Store
```

---

## 8. Role Definitions

### 8.1 Primary Coder
- Engine: **Claude Code + Sonnet**
- Responsibility:
  - implementation
  - code edits
  - test execution
  - iterative development
  - standard bug fixing
  - patch application

### 8.2 Deep Reasoner
- Engine: **Codex CLI**
- Responsibility:
  - architecture planning
  - broad refactor strategy
  - root-cause analysis
  - high-risk review
  - complex debugging
  - regression risk assessment

### 8.3 Vision Analyst
- Engine: **Gemini Pro family**
- Responsibility:
  - screenshot comparison
  - UI hierarchy analysis
  - spacing/alignment analysis
  - visual QA
  - mockup interpretation
  - design delta generation

### 8.4 Vision Executor
- Engine: **Gemini Flash family**
- Responsibility:
  - rapid implementation guidance
  - publishing instruction drafts
  - fast iterative UI proposal generation

---

## 9. Routing Policy

### 9.1 Standard Implementation
- Analyze: Claude Sonnet
- Execute: Claude Sonnet
- Review: optional Claude or Codex depending on risk

### 9.2 Simple Bug Fix
- Analyze: Claude Sonnet
- Execute: Claude Sonnet
- Review: optional

### 9.3 Complex Bug Fix
- Analyze: Codex (`high`)
- Execute: Claude Sonnet
- Review: Codex (`high`)

### 9.4 Architecture / Large Refactor
- Analyze: Codex (`xhigh`)
- Execute: Claude Sonnet
- Review: Codex (`high`)

### 9.5 UI Redesign / Mockup-Based Change
- Analyze: Gemini Pro
- Execute: Claude Sonnet
- Review: Gemini Pro

### 9.6 Publishing Fix / Visual Alignment
- Analyze: Gemini Pro
- Guide: Gemini Flash
- Execute: Claude Sonnet
- Review: Gemini Pro

### 9.7 Visual QA
- Analyze: Gemini Pro
- Execute: none
- Review: Gemini Pro

---

## 10. Codex Reasoning Policy

KhakiSketcher uses the following default reasoning effort policy.

| Task Type | Codex Effort | Rationale |
|---|---:|---|
| Architecture redesign | `xhigh` | broad structural exploration |
| Large refactor strategy | `xhigh` | dependency and impact planning |
| Performance strategy | `xhigh` | multiple hypothesis comparison |
| Complex debugging | `high` | deep root-cause analysis |
| Regression review | `high` | careful validation and risk review |
| General review | `medium` | balanced speed and depth |
| Minor analysis | `low` or `medium` | avoid unnecessary cost/latency |

### Default recommendation
- **Design / architecture** → `xhigh`
- **Debugging / root cause** → `high`
- **General review** → `medium`

---

## 11. tmux-First Runtime Design

### 11.1 Why tmux is mandatory
KhakiSketcher requires:

- persistent long-lived sessions
- inspectable worker panes
- stable multi-worker coordination
- crash recovery
- terminal-native observability
- resumable execution across disconnects

tmux is therefore treated as a **runtime dependency**, not an optional enhancement.

### 11.2 Session Unit
A session in KhakiSketcher is defined as:

- **task metadata**
- **git worktree**
- **tmux session**
- **worker assignments**
- **artifact directory**
- **event log**
- **status JSON**
- **approval state**

This is the fundamental durable runtime object.

### 11.3 tmux Design Principles

#### a. tmux is not the source of truth
Pane text alone is never the authoritative state.  
The source of truth is:

- metadata JSON
- lifecycle state
- event log
- heartbeat
- artifact references

#### b. tmux sessions must be idempotent
A session bootstrap must be safely repeatable.

#### c. each task gets an isolated session
No shared mutable pane execution across unrelated tasks.

#### d. pane role assignment is fixed
Example:

- pane 0: operator / control
- pane 1: Claude worker
- pane 2: Codex worker
- pane 3: Gemini worker
- pane 4: logs / monitor

#### e. all workers are launched through KhakiSketcher
Users should not manually improvise pane semantics.

### 11.4 Session Lifecycle
States:

- `created`
- `bootstrapping`
- `ready`
- `running`
- `waiting_approval`
- `blocked`
- `recovering`
- `completed`
- `failed`
- `aborted`
- `cleaned`

### 11.5 Heartbeat & Liveness
Each active worker must emit heartbeat metadata.  
If heartbeat expires:

- mark worker as `stalled`
- mark session as `recovering` or `blocked`
- optionally attempt controlled restart

### 11.6 Recovery Model
KhakiSketcher must support:

- reattaching to tmux sessions
- reconstructing session state from metadata
- restarting worker processes without losing task-level context
- resuming from last known artifact boundary

### 11.7 Logging
Every tmux-managed worker must stream:

- stdout/stderr capture
- stage transitions
- structured progress messages
- key artifact outputs

These must be persisted outside tmux.

---

## 12. Worktree Model

### 12.1 Mandatory worktree isolation
Each task session uses its own git worktree.

### 12.2 Worktree responsibilities
- isolate code modifications
- protect main branch from half-complete changes
- allow concurrent session execution
- simplify cleanup and review

### 12.3 Branch naming convention
Recommended pattern:

`khakisketcher/<task-id>-<short-purpose>`

Example:

`khakisketcher/task-104-checkout-redesign`

---

## 13. Data and Artifact Model

### 13.1 Artifact Types
- task spec
- context bundle
- codex analysis
- gemini visual delta
- implementation guide
- patch summary
- test result
- review result
- approval record
- session state
- event log

### 13.2 Example directory structure

```text
.orchestrator/
  sessions/
    task-104/
      session.json
      state.json
      events.log
      heartbeats.json
      tmux.json
      artifacts/
        task-spec.json
        codex-analysis.json
        gemini-delta.json
        implementation-guide.json
        patch-result.json
        test-result.json
```

### 13.3 Structured Handoff Contract
All workers must consume and emit structured artifacts.

No worker-to-worker freeform transcript dependency should be required for critical transitions.

---

## 14. Functional Requirements

### FR-1 Task Intake
KhakiSketcher shall accept a task request from the Claude Code entry path.

### FR-2 Task Classification
KhakiSketcher shall classify tasks into categories such as:

- implement
- bugfix_simple
- bugfix_complex
- architecture
- ui_redesign
- visual_qa
- publishing_fix

### FR-3 Policy Routing
KhakiSketcher shall map task type to role and engine assignments.

### FR-4 Session Creation
KhakiSketcher shall create a tmux-backed durable task session.

### FR-5 Worktree Provisioning
KhakiSketcher shall create an isolated git worktree per task session.

### FR-6 Context Bundling
KhakiSketcher shall provide role-specific context bundles to Claude, Codex, and Gemini workers.

### FR-7 Codex Effort Assignment
KhakiSketcher shall assign Codex reasoning effort automatically by task type.

### FR-8 Artifact Persistence
KhakiSketcher shall persist all intermediate and final artifacts to disk.

### FR-9 Progress Tracking
KhakiSketcher shall expose session and worker progress via status files and CLI commands.

### FR-10 Recovery
KhakiSketcher shall support recovering a session after terminal disconnect or worker interruption.

### FR-11 Approval Gating
KhakiSketcher shall require approval before destructive or high-risk actions.

### FR-12 Review Loop
KhakiSketcher shall support routing review artifacts back through Codex or Gemini where policy requires it.

---

## 15. Non-Functional Requirements

### NFR-1 Local-first
The product must work primarily on local developer machines.

### NFR-2 Terminal-native
Core workflows must be operable from CLI + tmux without web UI dependency.

### NFR-3 Observability
The system must expose structured logs, progress, and session states.

### NFR-4 Recoverability
Unexpected disconnects or worker termination must not irreversibly destroy session state.

### NFR-5 Determinism of policy
Given the same policy config and task class, routing should be consistent.

### NFR-6 Safety
Destructive actions must be gated and auditable.

### NFR-7 Extensibility
Future worker types or additional pane roles should be addable without redesigning the core model.

---

## 16. Safety and Approval Policy

Approval is required for:

- `rm` / large deletion
- `git push`
- deploy commands
- database migrations
- production config changes
- secrets access
- dangerous shell execution
- force branch overwrite

KhakiSketcher must log:

- who approved
- what was approved
- when approval occurred
- what session and task it applied to

---

## 17. Operator CLI Surface

Recommended command set:

```bash
khakisketcher init
khakisketcher run "<task>"
khakisketcher attach <task-id>
khakisketcher status [task-id]
khakisketcher logs <task-id>
khakisketcher ps
khakisketcher recover <task-id>
khakisketcher approve <task-id> <action>
khakisketcher abort <task-id>
khakisketcher cleanup <task-id>
```

Optional short alias:

```bash
ksk
```

---

## 18. Example Runtime Flow

### Complex debugging flow
1. Developer starts from Claude Code
2. KhakiSketcher classifies task as `bugfix_complex`
3. KhakiSketcher provisions worktree and tmux session
4. Codex worker starts with `high` effort
5. Codex produces root-cause analysis artifact
6. Claude Sonnet applies implementation patch
7. Tests run inside session worktree
8. Codex reviews regression risk
9. Session transitions to `completed` or `blocked`

### UI redesign flow
1. Developer provides screenshot / mockup
2. KhakiSketcher classifies task as `ui_redesign`
3. Gemini Pro analyzes visual delta
4. Gemini Flash optionally generates implementation guidance
5. Claude Sonnet updates code
6. Before/after capture is generated
7. Gemini Pro performs visual QA
8. Session completes

---

## 19. Configuration Model

Example `khakisketcher.config.yaml`:

```yaml
product_name: KhakiSketcher

defaults:
  primary_coder: claude_sonnet
  deep_reasoner: codex
  vision_analyst: gemini_pro
  vision_executor: gemini_flash

claude:
  mode: sonnet_only

codex:
  effort_defaults:
    architecture: xhigh
    refactor_large: xhigh
    debug_complex: high
    regression_review: high
    review_general: medium

gemini:
  analyst_model: gemini-pro
  executor_model: gemini-flash

runtime:
  tmux_required: true
  use_git_worktree: true
  heartbeat_interval_seconds: 20
  stale_after_seconds: 90

safety:
  approval_required:
    - rm
    - git_push
    - deploy
    - migration
    - prod_config
    - secrets

paths:
  state_dir: .orchestrator
```

---

## 20. Success Metrics

KhakiSketcher is successful if it achieves the following:

### Engineering metrics
- complex debugging turnaround time decreases
- architecture tasks complete without Opus dependence
- visual redesign tasks require fewer manual rework cycles
- concurrent sessions remain stable under tmux-backed execution

### Runtime metrics
- session recovery succeeds reliably
- stalled workers are detected automatically
- event and artifact logs remain complete and queryable
- worktree isolation prevents accidental pollution of primary branches

### UX metrics
- operators can understand task state from CLI
- reattachment to running sessions is fast and predictable
- routing behavior feels consistent and unsurprising

---

## 21. Release Plan

### v0.1
- core task classifier
- policy router
- Claude / Codex / Gemini adapters
- tmux-backed session manager
- worktree provisioning
- artifact persistence
- basic status / logs / attach / recover commands

### v0.2
- heartbeat + stalled detection
- richer approval gate
- Gemini Pro + Flash split behavior
- Codex effort automation
- review loop improvements

### v0.3
- improved recovery semantics
- operator monitor pane
- better event querying
- session cleanup automation
- parallel multi-session stability hardening

---

## 22. Open Questions

These items may be finalized during implementation:

1. exact pane layout defaults per task type
2. whether monitor pane is always present or optional
3. how screenshot capture is standardized across projects
4. how approvals integrate with Claude Code interaction flow
5. how much automatic retry is allowed before a session becomes blocked

---

## 23. Final Product Definition

**KhakiSketcher** is a **tmux-first orchestration runtime** for Claude Code-centered software development.

It uses:

- **Claude Sonnet only** for implementation and execution
- **Codex** for deep engineering reasoning, especially where Opus would otherwise be used
- **Gemini** for visual analysis and UI-oriented workflows
- **git worktree + tmux + metadata + artifacts** as the durable session model

KhakiSketcher is designed to make advanced local multi-agent engineering workflows:

- stable
- recoverable
- observable
- policy-driven
- practical for real development teams

---

## 24. Naming Standard

All internal and external product references shall use:

- **Product Name:** KhakiSketcher
- **Team / Brand:** KhakiSketch
- **Repository Name:** `khakisketcher`
- **Primary CLI Command:** `khakisketcher`
- **Optional Short CLI Alias:** `ksk`

No legacy product naming should remain in documentation, artifacts, or configuration examples.
