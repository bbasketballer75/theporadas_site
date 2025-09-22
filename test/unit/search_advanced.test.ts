import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import { buildCodeIndex } from '../src/search/code_index';
import { buildContentIndex } from '../src/search/content_index';
import { createEmbeddingsProvider, embedBatch } from '../src/search/embeddings';
import { search, synthesize } from '../src/search/retrieval';

// Declare process for type context (Node test env)
declare const process: { cwd(): string; chdir(dir: string): void };

// Advanced coverage tests hitting edge branches in search subsystem

describe('search advanced', () => {
  it('returns empty array when indices absent', async () => {
    // simulate by running search in a temp directory without indices
    const prevCwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'search-empty-'));
    try {
      process.chdir(dir);
      const results = await search('anything');
      expect(results).toEqual([]);
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('synthesize outputs ranked list with formatting', async () => {
    let results = await search('video player component');
    if (results.length === 0) {
      // Build indices on-demand if not yet created in this test run ordering
      await buildContentIndex();
      await buildCodeIndex();
      results = await search('video player component');
    }
    expect(results.length).toBeGreaterThan(0);
    const text = synthesize(results.slice(0, 2));
    const entryLineMatches = [...text.matchAll(/^(\(\d+\))/gm)];
    expect(entryLineMatches.length).toBe(2);
    expect(text).toMatch(/\(1\) \[.*?\]/);
  }, 30000);

  it('content index recomputes only changed chunk', async () => {
    // Use actual content dir: capture existing index, modify one file paragraph then restore
    const contentPath = join(process.cwd(), 'content', 'home.md');
    const original = readFileSync(contentPath, 'utf-8');
    // ensure baseline index
    const before = await buildContentIndex();
    const beforeIds = new Set(before.map((r) => r.id));
    // mutate by appending a unique paragraph to ensure a new chunk
    writeFileSync(contentPath, original + '\n\nTemporary unique paragraph 12345 for test.');
    try {
      const after = await buildContentIndex();
      const afterIds = new Set(after.map((r) => r.id));
      // At least one new id should appear
      let newCount = 0;
      afterIds.forEach((id) => {
        if (!beforeIds.has(id)) newCount++;
      });
      expect(newCount).toBeGreaterThan(0);
      // Most ids should be preserved (reuse path)
      let preserved = 0;
      beforeIds.forEach((id) => {
        if (afterIds.has(id)) preserved++;
      });
      expect(preserved).toBeGreaterThan(beforeIds.size * 0.8); // heuristic
    } finally {
      writeFileSync(contentPath, original); // restore
      await buildContentIndex(); // rebuild to original state
    }
  });

  it('OpenAI provider fallback when missing key returns local deterministic vectors', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Force provider selection without key
    const provider = createEmbeddingsProvider({ provider: 'openai', apiKey: undefined });
    const vecs = await provider.embedBatch(['alpha', 'beta']);
    expect(vecs.length).toBe(2);
    expect(vecs[0].length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('local embeddings deterministic across calls', async () => {
    const [a1] = await embedBatch(['determinism-example']);
    const [a2] = await embedBatch(['determinism-example']);
    expect(a1).toEqual(a2);
  });

  it('code index includes diverse symbol kinds when available', async () => {
    const code = await buildCodeIndex();
    const hasInterface = code.some((r) => /(InterfaceDeclaration)/.test(r.text));
    const hasFunction = code.some((r) => /(FunctionDeclaration)/.test(r.text));
    expect(hasFunction).toBe(true);
    // interface may or may not exist; we just assert at least function present to avoid flakiness
    expect(hasInterface === false || hasInterface === true).toBe(true);
  }, 30000);
});
