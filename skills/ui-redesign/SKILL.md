---
name: ui-redesign
description: UI redesign with Gemini visual analysis and QA loop. Use for mockup implementation, layout changes, and visual polish.
---

# UI Redesign

Vision-guided UI implementation workflow with visual QA verification loop.

## Usage

```
/ksk:ui-redesign <design task, mockup reference, or visual change request>
```

## Workflow

### Phase 1: Visual Analysis
1. Identify reference images (mockups, screenshots, design specs)
2. Call `ksk_vision` with mode="analyze" and the reference images:
   - Analyze layout structure and grid system
   - Identify typography, color, and spacing patterns
   - Generate specific implementation guidance
   - Note accessibility requirements (contrast, target sizes)

### Phase 2: Implementation
3. Based on the visual analysis, implement UI changes:
   - Follow the design delta precisely
   - Use existing design tokens and component patterns
   - Ensure responsive behavior
   - Claude Sonnet writes ALL code

### Phase 3: Visual QA (iterative, max 3 rounds)
4. If possible, capture a screenshot of the result
5. Call `ksk_vision` with mode="qa" comparing result to reference:
   - Check alignment to 8px grid
   - Verify spacing consistency
   - Validate color token usage
   - Check WCAG 2.1 AA contrast ratios
6. Evaluate the QA result:
   - **Score ≥ 85** → Complete
   - **Score < 85** → Apply specific fixes from QA feedback, repeat from step 4
   - **After 3 rounds** → Report remaining issues to user

## Model Policy
- Visual Analysis (Phase 1, 3): `ksk_vision` (Gemini → Codex fallback)
- Implementation (Phase 2): Claude Sonnet ONLY

Task: {{ARGUMENTS}}
