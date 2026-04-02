---
name: architecture
description: Architecture analysis and large-scale refactoring with Codex xhigh reasoning. Use for system design, module restructuring, and migration planning.
---

# Architecture

Deep architectural analysis and refactoring workflow with maximum reasoning depth.

## Usage

```
/ksk:architecture <architecture task or refactoring goal>
```

## Workflow

### Phase 1: Architectural Analysis
1. Gather context: identify all relevant modules, dependencies, and entry points
2. Call `ksk_context` with role="reasoning" and key file paths
3. Call `ksk_reason` with effort="xhigh":
   - Analyze coupling/cohesion metrics
   - Detect circular dependencies
   - Check SOLID principle violations
   - Estimate blast radius of proposed changes
   - Recommend migration strategy (Strangler Fig / Branch by Abstraction / Direct)

### Phase 2: Implementation Plan
4. Based on analysis, create a phased implementation plan
   - Each phase should be independently verifiable
   - Order phases by dependency (least dependent first)
   - Mark high-risk phases that need extra review

### Phase 3: Implementation
5. Execute each phase of the plan:
   - For large changes, use worktree isolation (`isolation: "worktree"`)
   - Implement one phase at a time
   - Run tests after each phase

### Phase 4: Review (iterative, max 3 rounds)
6. Call `ksk_reason` with effort="high" for architectural review:
   - Does the result match the intended architecture?
   - Are coupling metrics improved?
   - Are there unintended side effects?
7. Pass through `ksk_review_gate`:
   - **PASS** → Complete
   - **FAIL** → Fix issues and re-review

## Model Policy
- Analysis (Phase 1, 4): `ksk_reason` effort="xhigh" / "high"
- Planning (Phase 2): Claude Sonnet
- Implementation (Phase 3): Claude Sonnet ONLY

Task: {{ARGUMENTS}}
