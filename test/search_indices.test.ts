import { describe, it, expect, beforeAll } from 'vitest';

import { buildCodeIndex } from '../src/search/code_index';
import { chunkMarkdown, buildContentIndex } from '../src/search/content_index';
import { search } from '../src/search/retrieval';

// NOTE: Uses real repo content & code (deterministic local embeddings by default)

describe('search indices', () => {
  beforeAll(async () => {
    await buildContentIndex();
    await buildCodeIndex();
  }, 60000);

  it('chunkMarkdown produces chunks within size bounds', () => {
    const raw = Array.from({ length: 20 }, (_, i) => `Paragraph ${i} with some text`).join('\n\n');
    const chunks = chunkMarkdown(raw);
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) {
      expect(c.length).toBeGreaterThan(50);
      expect(c.length).toBeLessThanOrEqual(600);
    }
  });

  it('content index reuse avoids duplicate embeddings by hash (id stable)', async () => {
    const run1 = await buildContentIndex();
    const ids1 = new Set(run1.map((r) => r.id));
    const run2 = await buildContentIndex();
    const ids2 = new Set(run2.map((r) => r.id));
    expect(ids1.size).toBe(ids2.size);
    // Expect identical id sets
    for (const id of ids1) expect(ids2.has(id)).toBe(true);
  });

  it('code index builds symbol exports', async () => {
    const code = await buildCodeIndex();
    expect(code.length).toBeGreaterThan(10);
    const gallery = code.find((r) => r.source.includes('Gallery.tsx#Gallery'));
    expect(gallery).toBeTruthy();
  }, 20000);

  it('retrieval ranks relevant results for a query', async () => {
    const results = await search('video quality source selection');
    expect(results.length).toBeGreaterThan(0);
    // Expect at least one code or content snippet referencing video
    expect(results.some((r) => /video/i.test(r.text))).toBe(true);
  });
});
