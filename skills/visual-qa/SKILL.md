---
name: visual-qa
description: Screenshot comparison and visual quality assessment. Use for before/after comparison, design verification, and pixel-level QA.
---

# Visual QA

Single-pass visual comparison and quality assessment.

## Usage

```
/ksk:visual-qa <description of what to compare, with image paths>
```

## Workflow

### Step 1: Gather Images
1. Identify the images to compare (before/after, mockup/implementation, reference/current)
2. Ensure file paths are absolute or relative to the project root

### Step 2: Visual Comparison
3. Call `ksk_vision` with mode="compare" and the image paths:
   - Identify ALL visual differences
   - Classify each: intentional / regression / side-effect
   - Check layout alignment (8px grid)
   - Verify spacing consistency
   - Validate color accuracy
   - Check accessibility (WCAG 2.1 AA contrast)

### Step 3: Structured Verdict
4. Report the results in a structured format:

```
Score: [0-100]
Verdict: PASS (≥85) / NEEDS_WORK (60-84) / FAIL (<60)

Differences:
1. [location] - [description] - [intentional/regression]
2. ...

Accessibility:
- Contrast: PASS/FAIL
- Target sizes: PASS/FAIL

Suggestions:
1. [specific actionable fix]
```

## Model Policy
- ALL analysis: `ksk_vision` (Gemini → Codex fallback)
- This skill does NOT write or modify code

Task: {{ARGUMENTS}}
