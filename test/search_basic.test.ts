import { describe, it, expect } from 'vitest';

import { cosineSimilarity, embedBatch } from '../src/search/embeddings';

describe('embeddings', () => {
  it('deterministic local embeddings produce identical vectors for same text', async () => {
    const [a, b] = await embedBatch(['hello world', 'hello world']);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });
  it('cosine similarity of identical vectors is 1', () => {
    const v = [0.1, 0.2, 0.3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });
});
