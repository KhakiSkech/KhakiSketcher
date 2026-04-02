import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { smartTruncate } from '../utils/truncate.js';

describe('smartTruncate', () => {
  it('returns content unchanged when under maxChars', () => {
    const content = 'short content';
    assert.strictEqual(smartTruncate(content, undefined, { maxChars: 100 }), content);
  });

  it('returns content unchanged when exactly at maxChars', () => {
    const content = 'a'.repeat(100);
    assert.strictEqual(smartTruncate(content, undefined, { maxChars: 100 }), content);
  });

  it('truncates to maxChars and appends suffix when over limit', () => {
    const content = 'a'.repeat(5000);
    const result = smartTruncate(content, undefined, { maxChars: 100 });
    assert.ok(result.includes('...(truncated)'), 'missing truncated suffix');
    // Content portion must not exceed maxChars
    const contentPart = result.replace('\n...(truncated)', '');
    assert.ok(contentPart.length <= 100, `content part too long: ${contentPart.length}`);
  });

  it('includes error line context when filepath:line found in content', () => {
    const prefix = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n');
    const errorLine = 'ERROR: null reference at src/foo.ts:51';
    const suffix = Array.from({ length: 150 }, (_, i) => `data line ${i + 52}`).join('\n');
    const content = [prefix, errorLine, suffix].join('\n');

    const result = smartTruncate(content, 'src/foo.ts', { maxChars: 1000, contextLines: 5 });
    assert.ok(result.includes('ERROR: null reference'), `Expected error line in output: ${result.slice(0, 200)}`);
  });

  it('falls back to front-truncation when no error line found in content', () => {
    const content = 'FIRST_LINE\n' + 'x'.repeat(5000);
    const result = smartTruncate(content, 'src/nonexistent.ts', { maxChars: 100 });
    assert.ok(result.startsWith('FIRST_LINE'), `Expected front-truncation: ${result.slice(0, 50)}`);
    assert.ok(result.includes('...(truncated)'));
  });

  it('falls back to front-truncation when no filepath provided', () => {
    const content = 'HEAD\n' + 'y'.repeat(5000);
    const result = smartTruncate(content, undefined, { maxChars: 50 });
    assert.ok(result.startsWith('HEAD'), `Expected HEAD at start: ${result.slice(0, 30)}`);
  });

  it('result total length is bounded', () => {
    const content = 'a'.repeat(10000);
    const result = smartTruncate(content, undefined, { maxChars: 200 });
    // suffix adds ~15 chars
    assert.ok(result.length <= 220, `result too long: ${result.length}`);
  });
});
