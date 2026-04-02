import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { kskReviewGateHandler } from '../tools/ksk-review-gate.js';

describe('kskReviewGateHandler — structured verdict parsing', () => {
  it('parses PASS verdict → action=complete', async () => {
    const result = await kskReviewGateHandler({
      review_text: '## Verdict: PASS\nAll checks passed.',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('PASS'), `Expected PASS in: ${text}`);
    assert.ok(text.includes('complete'), `Expected complete in: ${text}`);
  });

  it('parses FAIL_CRITICAL → action=escalate_to_user', async () => {
    const result = await kskReviewGateHandler({
      review_text: '## Verdict: FAIL_CRITICAL\nSecurity vulnerability found.',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('FAIL_CRITICAL'), `Expected FAIL_CRITICAL in: ${text}`);
    assert.ok(text.includes('escalate_to_user'), `Expected escalate_to_user in: ${text}`);
  });

  it('parses FAIL_MINOR → action=self_fix when iterations remain', async () => {
    const result = await kskReviewGateHandler({
      review_text: '## Verdict: FAIL_MINOR\nMinor style nit.',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('self_fix'), `Expected self_fix in: ${text}`);
  });

  it('escalates when iteration >= max_iterations regardless of verdict', async () => {
    const result = await kskReviewGateHandler({
      review_text: '## Verdict: FAIL_MINOR\nMinor issue.',
      iteration: 3,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('escalate_to_user'), `Expected escalation at max iter: ${text}`);
  });

  it('extracts CRITICAL severity from structured issues section', async () => {
    const result = await kskReviewGateHandler({
      review_text: '## Verdict: FAIL_CRITICAL\n## Issues\n- [CRITICAL] 보안 취약점 발견',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('critical'), `Expected critical severity in: ${text}`);
  });
});

describe('kskReviewGateHandler — heuristic fallback', () => {
  it('heuristic PASS for short approving text', async () => {
    const result = await kskReviewGateHandler({
      review_text: 'LGTM, approved.',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('PASS') || text.includes('complete'), `Expected PASS/complete in: ${text}`);
  });

  it('heuristic FAIL_CRITICAL for critical keyword', async () => {
    const result = await kskReviewGateHandler({
      review_text: 'Critical security vulnerability found, data loss possible.',
      iteration: 1,
      max_iterations: 3,
    });
    const text = (result.content[0] as { type: string; text: string }).text;
    assert.ok(text.includes('FAIL_CRITICAL') || text.includes('escalate'), `Expected critical escalation in: ${text}`);
  });
});
