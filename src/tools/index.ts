import { z } from 'zod';
import { kskReasonSchema, kskReasonHandler } from './ksk-reason.js';
import { kskVisionSchema, kskVisionHandler } from './ksk-vision.js';
import { kskClassifySchema, kskClassifyHandler } from './ksk-classify.js';
import { kskReviewGateSchema, kskReviewGateHandler } from './ksk-review-gate.js';
import { kskContextSchema, kskContextHandler } from './ksk-context.js';
import { kskStatusSchema, kskStatusHandler } from './ksk-status.js';
import { kskHudSchema, kskHudHandler } from './ksk-hud.js';
import { kskPlanSchema, kskPlanHandler } from './ksk-plan.js';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

export const tools: ToolDefinition[] = [
  {
    name: 'ksk_reason',
    description: 'Deep reasoning via Codex CLI (fallback: Gemini Pro). Use for architecture analysis, complex debugging root-cause, regression review, and broad refactor strategy. Reads context_files from disk. Auto-retries on rate limits and surfaces the decision to the user.',
    schema: kskReasonSchema,
    handler: kskReasonHandler,
  },
  {
    name: 'ksk_vision',
    description: 'Visual analysis via Gemini Pro (fallback: Codex). Use for screenshot comparison, UI QA, layout analysis, and design delta generation. Supports analyze/compare/qa modes. Use fast=true for Gemini Flash (rapid iteration).',
    schema: kskVisionSchema,
    handler: kskVisionHandler,
  },
  {
    name: 'ksk_classify',
    description: 'Classify a task description into a category and return a full routing plan with provider assignments per phase.',
    schema: kskClassifySchema,
    handler: kskClassifyHandler,
  },
  {
    name: 'ksk_review_gate',
    description: 'Parse review results into a structured verdict (PASS/FAIL_MINOR/FAIL_MAJOR/FAIL_CRITICAL) and determine next action. Enforces iterative review loops with max iteration cap.',
    schema: kskReviewGateSchema,
    handler: kskReviewGateHandler,
  },
  {
    name: 'ksk_context',
    description: 'Build role-optimized context bundles for reasoning, vision, or implementation tasks.',
    schema: kskContextSchema,
    handler: kskContextHandler,
  },
  {
    name: 'ksk_status',
    description: 'View session context and browse artifacts. Lists recent artifacts by category, reads specific artifact contents, and shows session state.',
    schema: kskStatusSchema,
    handler: kskStatusHandler,
  },
  {
    name: 'ksk_hud',
    description: 'Show session dashboard: provider stats (Codex/Gemini call counts, duration, estimated tokens, rate limits), artifact counts, session duration, and last task classification.',
    schema: kskHudSchema,
    handler: kskHudHandler,
  },
  {
    name: 'ksk_plan',
    description: 'Auto-discover relevant files for a task and call ksk_reason with them. Use instead of ksk_reason when you don\'t know which files are relevant.',
    schema: kskPlanSchema,
    handler: kskPlanHandler,
  },
];
