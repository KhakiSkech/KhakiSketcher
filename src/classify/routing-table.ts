import type { TaskCategory } from './rules.js';
import type { ReasoningEffort } from '../providers/types.js';

export type PhaseProvider = 'claude' | 'reason' | 'vision' | 'none';

export interface Phase {
  phase: 'analyze' | 'implement' | 'test' | 'review';
  provider: PhaseProvider;
  effort?: ReasoningEffort;
}

export interface RoutingPlan {
  category: TaskCategory;
  phases: Phase[];
  suggested_skill: string | null;
  max_iterations: number;
}

const ROUTING_TABLE: Record<TaskCategory, RoutingPlan> = {
  implement: {
    category: 'implement',
    phases: [
      { phase: 'analyze', provider: 'claude' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'none' },
    ],
    suggested_skill: null,
    max_iterations: 1,
  },
  bugfix_simple: {
    category: 'bugfix_simple',
    phases: [
      { phase: 'analyze', provider: 'claude' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'none' },
    ],
    suggested_skill: null,
    max_iterations: 1,
  },
  bugfix_complex: {
    category: 'bugfix_complex',
    phases: [
      { phase: 'analyze', provider: 'reason', effort: 'high' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'reason', effort: 'high' },
    ],
    suggested_skill: 'complex-debug',
    max_iterations: 3,
  },
  architecture: {
    category: 'architecture',
    phases: [
      { phase: 'analyze', provider: 'reason', effort: 'xhigh' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'reason', effort: 'high' },
    ],
    suggested_skill: 'architecture',
    max_iterations: 3,
  },
  ui_redesign: {
    category: 'ui_redesign',
    phases: [
      { phase: 'analyze', provider: 'vision' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'vision' },
    ],
    suggested_skill: 'ui-redesign',
    max_iterations: 3,
  },
  visual_qa: {
    category: 'visual_qa',
    phases: [
      { phase: 'analyze', provider: 'vision' },
      { phase: 'implement', provider: 'none' },
      { phase: 'test', provider: 'none' },
      { phase: 'review', provider: 'vision' },
    ],
    suggested_skill: 'visual-qa',
    max_iterations: 1,
  },
  publishing_fix: {
    category: 'publishing_fix',
    phases: [
      { phase: 'analyze', provider: 'reason', effort: 'medium' },
      { phase: 'implement', provider: 'claude' },
      { phase: 'test', provider: 'claude' },
      { phase: 'review', provider: 'reason', effort: 'medium' },
    ],
    suggested_skill: 'complex-debug',
    max_iterations: 2,
  },
};

export function getRoutingPlan(category: TaskCategory): RoutingPlan {
  return ROUTING_TABLE[category];
}
