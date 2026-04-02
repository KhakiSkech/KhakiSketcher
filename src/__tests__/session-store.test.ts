import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSession, saveSession, addArtifactPath, recordProviderCall } from '../session/store.js';

const TEST_DIR = join(tmpdir(), `ksk-test-${Date.now()}`);

before(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('loadSession', () => {
  it('returns defaults when session file is missing', () => {
    const dir = join(TEST_DIR, 'fresh');
    const session = loadSession(dir);
    assert.deepStrictEqual(session.artifact_paths, []);
    assert.strictEqual(session.provider_stats.codex.call_count, 0);
    assert.strictEqual(session.provider_stats.gemini.call_count, 0);
    assert.strictEqual(session.provider_stats.gemini.rate_limit_count, 0);
  });

  it('returns defaults for corrupted JSON', () => {
    const dir = join(TEST_DIR, 'corrupt');
    mkdirSync(join(dir, '.ksk'), { recursive: true });
    writeFileSync(join(dir, '.ksk', 'session.json'), '{broken json!!}', 'utf-8');
    const session = loadSession(dir);
    assert.deepStrictEqual(session.artifact_paths, []);
  });

  it('returns defaults for empty JSON file', () => {
    const dir = join(TEST_DIR, 'empty');
    mkdirSync(join(dir, '.ksk'), { recursive: true });
    writeFileSync(join(dir, '.ksk', 'session.json'), '', 'utf-8');
    const session = loadSession(dir);
    assert.deepStrictEqual(session.artifact_paths, []);
  });
});

describe('saveSession + loadSession round-trip', () => {
  it('persists and restores artifact_paths', () => {
    const dir = join(TEST_DIR, 'roundtrip');
    const session = loadSession(dir);
    saveSession({ ...session, artifact_paths: ['/foo/bar.md', '/baz/qux.md'] }, dir);
    const restored = loadSession(dir);
    assert.deepStrictEqual(restored.artifact_paths, ['/foo/bar.md', '/baz/qux.md']);
  });

  it('no .tmp file remains after saveSession', () => {
    const dir = join(TEST_DIR, 'notmp');
    const session = loadSession(dir);
    saveSession(session, dir);
    const kskDir = join(dir, '.ksk');
    if (existsSync(kskDir)) {
      const files = readdirSync(kskDir);
      assert.ok(!files.some(f => f.endsWith('.tmp')), `Found stale .tmp: ${files.join(', ')}`);
    }
  });
});

describe('addArtifactPath', () => {
  it('adds path and prevents duplicates', () => {
    const dir = join(TEST_DIR, 'dedup');
    addArtifactPath('/foo/a.md', dir);
    addArtifactPath('/foo/a.md', dir);
    addArtifactPath('/foo/b.md', dir);
    const session = loadSession(dir);
    assert.strictEqual(session.artifact_paths.length, 2);
    assert.ok(session.artifact_paths.includes('/foo/a.md'));
    assert.ok(session.artifact_paths.includes('/foo/b.md'));
  });
});

describe('recordProviderCall', () => {
  it('increments rate_limit_count and not call_count on rate limit', () => {
    const dir = join(TEST_DIR, 'ratelimit');
    recordProviderCall('gemini', 0, 0, true, dir);
    const session = loadSession(dir);
    assert.strictEqual(session.provider_stats.gemini.rate_limit_count, 1);
    assert.strictEqual(session.provider_stats.gemini.call_count, 0);
  });

  it('increments call_count and total_duration_ms on success', () => {
    const dir = join(TEST_DIR, 'success');
    recordProviderCall('codex', 500, 1000, false, dir);
    const session = loadSession(dir);
    assert.strictEqual(session.provider_stats.codex.call_count, 1);
    assert.strictEqual(session.provider_stats.codex.total_duration_ms, 500);
    assert.ok(session.provider_stats.codex.estimated_tokens > 0);
  });

  it('accumulates across multiple calls', () => {
    const dir = join(TEST_DIR, 'accumulate');
    recordProviderCall('codex', 200, 800, false, dir);
    recordProviderCall('codex', 300, 1200, false, dir);
    const session = loadSession(dir);
    assert.strictEqual(session.provider_stats.codex.call_count, 2);
    assert.strictEqual(session.provider_stats.codex.total_duration_ms, 500);
  });
});
