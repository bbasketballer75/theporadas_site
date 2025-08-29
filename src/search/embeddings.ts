// Embedding abstraction with pluggable providers (OpenAI | local deterministic)
// Minimal surface: embedBatch(texts) -> number[][]

import crypto from 'node:crypto';

// Declare process for typecheck in ESM context if not picked up
// (tsconfig should normally provide Node types)
declare const process: { env: Record<string, string | undefined> };

export interface EmbeddingsOptions {
  provider?: string; // 'openai' | 'local'
  apiKey?: string;
  model?: string; // model name when provider = openai
  dimensions?: number; // override for local
}

export interface EmbeddingsProvider {
  embedBatch(texts: string[]): Promise<number[][]>;
}

const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small';
const DEFAULT_LOCAL_DIM = 256; // smaller for deterministic + fast

// Deterministic pseudo-embedding: hash -> seeded PRNG -> vector on unit sphere
function localDeterministicEmbedding(text: string, dim: number): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  // Use hash bytes as seed material; simple xorshift32
  let seed = hash.readUInt32BE(0) ^ hash.readUInt32BE(4) ^ hash.readUInt32BE(28);
  function rnd() {
    // xorshift32
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff;
  }
  const vec: number[] = [];
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    // Box-Muller for approximate normal distribution
    const u1 = rnd() || 1e-9;
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    vec.push(z);
    norm += z * z;
  }
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

class LocalProvider implements EmbeddingsProvider {
  constructor(private dim: number) {}
  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => localDeterministicEmbedding(t, this.dim));
  }
}

class OpenAIProvider implements EmbeddingsProvider {
  private model: string;
  private apiKey: string;
  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || DEFAULT_OPENAI_MODEL;
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    const fetchFn =
      globalThis.fetch || ((await import('node-fetch')).default as unknown as typeof fetch);
    const resp = await fetchFn('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI embeddings error ${resp.status}: ${txt}`);
    }
    const data: { data: { embedding: number[] }[] } = await resp.json();
    return data.data.map((d) => d.embedding);
  }
}

export function createEmbeddingsProvider(opts: EmbeddingsOptions = {}): EmbeddingsProvider {
  const envRaw = process.env.EMBEDDINGS_PROVIDER;
  const envProvider = envRaw ? envRaw.trim().toLowerCase() : undefined;
  const provider = (opts.provider || envProvider || 'local').toLowerCase();
  if (provider === 'openai') {
    const apiKey = opts.apiKey || process.env.EMBEDDINGS_API_KEY;
    if (!apiKey) {
      // Fallback to local with warning
      console.warn('[embeddings] Missing EMBEDDINGS_API_KEY, falling back to local provider');
      return new LocalProvider(opts.dimensions || DEFAULT_LOCAL_DIM);
    }
    return new OpenAIProvider(apiKey, opts.model);
  }
  return new LocalProvider(opts.dimensions || DEFAULT_LOCAL_DIM);
}

// Convenience singleton (lazy)
let defaultProvider: EmbeddingsProvider | null = null;
export async function embedBatch(
  texts: string[],
  options?: EmbeddingsOptions,
): Promise<number[][]> {
  if (!defaultProvider || options) {
    defaultProvider = createEmbeddingsProvider(options);
  }
  return defaultProvider.embedBatch(texts);
}

// Simple cosine similarity util (may be reused elsewhere)
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export type VectorRecord = {
  id: string;
  kind: 'content' | 'code';
  source: string; // file or symbol path
  text: string;
  embedding: number[];
};
