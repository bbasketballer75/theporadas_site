import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { embedBatch, cosineSimilarity, VectorRecord } from './embeddings.js';

declare const process: {
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
};

interface SearchResult extends VectorRecord {
  score: number;
}

function loadIndex(file: string): VectorRecord[] {
  try {
    const raw = readFileSync(file, 'utf-8');
    return JSON.parse(raw) as VectorRecord[];
  } catch {
    return [];
  }
}

export async function search(query: string, k = 8): Promise<SearchResult[]> {
  const base = process.cwd();
  const content = loadIndex(join(base, 'search_index', 'content.json'));
  const code = loadIndex(join(base, 'search_index', 'code.json'));
  const all = [...content, ...code];
  if (!all.length) return [];
  const [qVec] = await embedBatch([query]);
  const scored: SearchResult[] = all.map((rec) => ({
    ...rec,
    score: cosineSimilarity(qVec, rec.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function synthesize(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `(${i + 1}) [${r.kind}] ${r.source} score=${r.score.toFixed(4)}\n${r.text.slice(0, 240)}${r.text.length > 240 ? '…' : ''}`,
    )
    .join('\n\n');
}

async function main() {
  const args = process.argv.slice(2);
  const q = args.join(' ').trim();
  if (!q) {
    console.error('Usage: search:query <query terms>');
    process.exit(1);
  }
  const results = await search(q);
  console.log(synthesize(results));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
