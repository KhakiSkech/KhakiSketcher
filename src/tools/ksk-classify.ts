import { z } from 'zod';
import { classifyComposite } from '../classify/rules.js';
import { getRoutingPlan } from '../classify/routing-table.js';
import { writeArtifact } from '../artifacts/writer.js';
import { addArtifactPath, setLastClassification } from '../session/store.js';

export const kskClassifySchema = {
  task_description: z.string().describe('Natural language task description to classify'),
};

export async function kskClassifyHandler(args: { task_description: string }) {
  try {
    const composite = classifyComposite(args.task_description);
    const routing = getRoutingPlan(composite.primary.category);

    const result = {
      is_composite: composite.is_composite,
      category: composite.primary.category,
      confidence: composite.primary.confidence,
      phases: routing.phases,
      suggested_skill: routing.suggested_skill,
      max_iterations: routing.max_iterations,
      scores: composite.primary.scores,
      subtasks: composite.subtasks?.map((s) => ({
        category: s.category,
        confidence: s.confidence,
      })),
      execution_order: composite.execution_order,
    };

    const artifactPath = writeArtifact(
      'classify',
      JSON.stringify(result, null, 2),
      args.task_description.slice(0, 60),
    );

    // Persist to session
    addArtifactPath(artifactPath);
    setLastClassification(composite);

    const phasesSummary = routing.phases
      .filter(p => p.provider !== 'none')
      .map(p => `  ${p.phase}: ${p.provider}${p.effort ? ` (${p.effort})` : ''}`)
      .join('\n');

    const skillHint = routing.suggested_skill
      ? `\n**Suggested Skill**: /ksk:${routing.suggested_skill}`
      : '';

    const subtaskLines = composite.subtasks && composite.subtasks.length > 0
      ? '\n**Subtasks**:\n' + composite.subtasks.map(
          (s) => `  - ${s.category} (confidence: ${s.confidence})`
        ).join('\n')
      : '';

    const orderLine = composite.is_composite
      ? `\n**Execution Order**: ${composite.execution_order.join(' -> ')}`
      : '';

    return {
      content: [{
        type: 'text' as const,
        text: [
          `## Task Classification`,
          `**Category**: ${composite.primary.category} (confidence: ${composite.primary.confidence})`,
          `**Composite**: ${composite.is_composite}`,
          `**Routing Plan**:`,
          phasesSummary,
          `**Max Iterations**: ${routing.max_iterations}`,
          skillHint,
          subtaskLines,
          orderLine,
        ].filter(Boolean).join('\n'),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `ksk_classify error: ${(error as Error).message}` }],
      isError: true,
    };
  }
}
