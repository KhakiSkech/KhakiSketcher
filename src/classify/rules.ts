export type TaskCategory =
  | 'implement'
  | 'bugfix_simple'
  | 'bugfix_complex'
  | 'architecture'
  | 'ui_redesign'
  | 'visual_qa'
  | 'publishing_fix';

interface SignalRule {
  pattern: RegExp;
  weight: number;
  categories: TaskCategory[];
}

const SIGNAL_RULES: SignalRule[] = [
  // Architecture signals
  { pattern: /설계|아키텍처|architecture|리팩터|refactor|구조\s*변경|모듈\s*분리|의존성/i, weight: 3, categories: ['architecture'] },
  { pattern: /마이그레이션|migration|대규모|large.?scale|시스템\s*설계/i, weight: 2, categories: ['architecture'] },

  // Complex debug signals
  { pattern: /근본\s*원인|root.?cause|왜.*안\s*[돼되]|크래시|crash|segfault|메모리\s*릭/i, weight: 3, categories: ['bugfix_complex'] },
  { pattern: /스택\s*트레이스|stack.?trace|Exception|Traceback|core\s*dump/i, weight: 3, categories: ['bugfix_complex'] },
  { pattern: /간헐적|intermittent|재현.*어|race\s*condition|deadlock|동시성/i, weight: 2, categories: ['bugfix_complex'] },

  // Simple bugfix signals
  { pattern: /버그|bug|오류|에러|error|고[쳐져]|fix|수정해|안\s*[돼되나]|깨[졌진]/i, weight: 2, categories: ['bugfix_simple'] },
  { pattern: /타입\s*에러|TypeError|null\s*참조|undefined|NaN/i, weight: 1, categories: ['bugfix_simple'] },

  // UI redesign signals
  { pattern: /UI|디자인|레이아웃|목업|mockup|리디자인|redesign|화면.*바꿔/i, weight: 3, categories: ['ui_redesign'] },
  { pattern: /컴포넌트.*만들|새로운.*화면|페이지.*디자인|스타일/i, weight: 2, categories: ['ui_redesign'] },

  // Visual QA signals
  { pattern: /비교해|compare|before.*after|전후|스크린샷.*확인|visual.*qa|시각.*검증/i, weight: 3, categories: ['visual_qa'] },
  { pattern: /정렬|alignment|간격|spacing|색상.*일치|pixel/i, weight: 2, categories: ['visual_qa'] },

  // Publishing fix signals
  { pattern: /배포.*수정|publishing|빌드.*오류|build.*fix|번들/i, weight: 2, categories: ['publishing_fix'] },

  // Vision signals (boost ui_redesign or visual_qa)
  { pattern: /이미지|image|스크린샷|screenshot|\.png|\.jpg|\.svg|\.webp/i, weight: 2, categories: ['ui_redesign', 'visual_qa'] },

  // Implementation signals
  { pattern: /만들어|구현|implement|추가해|add|기능.*개발|새로운.*기능/i, weight: 2, categories: ['implement'] },
  { pattern: /API|엔드포인트|endpoint|라우트|route|컨트롤러/i, weight: 1, categories: ['implement'] },

  // Complexity escalators (bump simple → complex)
  { pattern: /복잡|complex|어려운|difficult|여러.*파일|multi.?file|전체/i, weight: 1, categories: ['bugfix_complex', 'architecture'] },
];

export interface ClassifyResult {
  category: TaskCategory;
  confidence: number;
  scores: Record<string, number>;
}

export interface CompositeClassifyResult {
  is_composite: boolean;
  primary: ClassifyResult;
  subtasks?: ClassifyResult[];
  execution_order: TaskCategory[];
}

const COMPOSITE_THRESHOLD = 3;

export function classifyTask(description: string): ClassifyResult {
  const scores: Record<string, number> = {
    implement: 0,
    bugfix_simple: 0,
    bugfix_complex: 0,
    architecture: 0,
    ui_redesign: 0,
    visual_qa: 0,
    publishing_fix: 0,
  };

  for (const rule of SIGNAL_RULES) {
    if (rule.pattern.test(description)) {
      for (const cat of rule.categories) {
        scores[cat] += rule.weight;
      }
    }
  }

  // If both simple and complex bugfix scored, resolve
  if (scores.bugfix_simple > 0 && scores.bugfix_complex > scores.bugfix_simple) {
    scores.bugfix_simple = 0;
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCategory, topScore] = entries[0];
  const totalWeight = entries.reduce((sum, [, s]) => sum + s, 0);
  const confidence = totalWeight > 0 ? topScore / totalWeight : 0;

  // Default to implement if no strong signal
  const category = topScore === 0 ? 'implement' : topCategory as TaskCategory;

  return { category, confidence: Math.round(confidence * 100) / 100, scores };
}

/**
 * Execution order priority: analysis-heavy categories first, then implementation.
 */
const CATEGORY_PRIORITY: Record<TaskCategory, number> = {
  architecture: 1,
  bugfix_complex: 2,
  bugfix_simple: 3,
  ui_redesign: 4,
  visual_qa: 5,
  implement: 6,
  publishing_fix: 7,
};

export function classifyComposite(description: string): CompositeClassifyResult {
  const primary = classifyTask(description);
  const entries = Object.entries(primary.scores)
    .filter(([cat, score]) => score >= COMPOSITE_THRESHOLD && cat !== primary.category)
    .sort((a, b) => b[1] - a[1]);

  const subtasks: ClassifyResult[] = entries.map(([cat, score]) => {
    const totalWeight = Object.values(primary.scores).reduce((s, v) => s + v, 0);
    const confidence = totalWeight > 0 ? score / totalWeight : 0;
    return {
      category: cat as TaskCategory,
      confidence: Math.round(confidence * 100) / 100,
      scores: primary.scores,
    };
  });

  const allCategories = [primary.category, ...subtasks.map((s) => s.category)];
  const executionOrder = [...allCategories].sort(
    (a, b) => (CATEGORY_PRIORITY[a] ?? 99) - (CATEGORY_PRIORITY[b] ?? 99),
  );

  return {
    is_composite: subtasks.length > 0,
    primary,
    subtasks: subtasks.length > 0 ? subtasks : undefined,
    execution_order: executionOrder,
  };
}
