import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTask, classifyComposite } from '../classify/rules.js';

describe('classifyTask', () => {
  it('classifies crash signal as bugfix_complex', () => {
    const result = classifyTask('크래시가 발생했어요');
    assert.strictEqual(result.category, 'bugfix_complex');
  });

  it('classifies UI signal as ui_redesign', () => {
    const result = classifyTask('버튼 UI 디자인 변경');
    assert.strictEqual(result.category, 'ui_redesign');
  });

  it('classifies implement signal', () => {
    const result = classifyTask('새로운 기능 추가해줘');
    assert.strictEqual(result.category, 'implement');
  });

  it('defaults to implement for empty input', () => {
    const result = classifyTask('');
    assert.strictEqual(result.category, 'implement');
  });

  it('resolves bugfix_complex over bugfix_simple when both match', () => {
    const result = classifyTask('버그 크래시 발생 — 근본 원인 파악 필요');
    assert.strictEqual(result.category, 'bugfix_complex');
    assert.strictEqual(result.scores['bugfix_simple'], 0);
  });

  it('returns confidence in [0, 1] range', () => {
    const result = classifyTask('리팩터링 아키텍처 설계');
    assert.ok(result.confidence >= 0 && result.confidence <= 1, `confidence=${result.confidence} out of range`);
  });

  it('classifies architecture signal', () => {
    const result = classifyTask('시스템 아키텍처 설계 및 모듈 분리');
    assert.strictEqual(result.category, 'architecture');
  });

  it('classifies visual_qa signal', () => {
    const result = classifyTask('스크린샷 비교해서 전후 비주얼 QA 확인');
    assert.strictEqual(result.category, 'visual_qa');
  });
});

describe('classifyComposite', () => {
  it('returns is_composite=false for single-category input', () => {
    const result = classifyComposite('새로운 기능 추가해줘');
    assert.strictEqual(result.is_composite, false);
    assert.strictEqual(result.subtasks, undefined);
  });

  it('returns execution_order with at least one element', () => {
    const result = classifyComposite('버그 수정');
    assert.ok(Array.isArray(result.execution_order));
    assert.ok(result.execution_order.length >= 1);
  });

  it('primary category is included in execution_order', () => {
    const result = classifyComposite('UI 디자인 변경');
    assert.ok(result.execution_order.includes(result.primary.category));
  });

  it('execution_order respects priority: architecture before implement', () => {
    const result = classifyComposite('아키텍처 설계 후 새로운 기능 구현 추가해');
    const archIdx = result.execution_order.indexOf('architecture');
    const implIdx = result.execution_order.indexOf('implement');
    if (archIdx !== -1 && implIdx !== -1) {
      assert.ok(archIdx < implIdx, `architecture(${archIdx}) should come before implement(${implIdx})`);
    }
  });
});
