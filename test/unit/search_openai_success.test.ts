import { describe, it, expect, vi } from 'vitest';

import { createEmbeddingsProvider } from '../src/search/embeddings';

// We mock fetch BEFORE creating provider to simulate OpenAI success path.

// Declare minimal global typing for fetch replacement in test context
// (Node 18+ provides global fetch; this ensures TypeScript awareness.)
declare const global: { fetch?: unknown };

describe('OpenAIProvider success path', () => {
  it('returns embeddings from mocked OpenAI API', async () => {
    const fakeVectors = [
      Array.from({ length: 5 }, (_, i) => i * 0.1),
      Array.from({ length: 5 }, (_, i) => 1 - i * 0.05),
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: fakeVectors.map((embedding) => ({ embedding })) }),
    });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    const provider = createEmbeddingsProvider({ provider: 'openai', apiKey: 'sk-test' });
    const out = await provider.embedBatch(['alpha', 'beta']);
    expect(out).toHaveLength(2);
    expect(out[0].length).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
