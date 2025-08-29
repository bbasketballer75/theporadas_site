import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import * as embeddings from '../src/search/embeddings';
import { search } from '../src/search/retrieval';

// Declare process for type context (provided by test runner env)
declare const process: { cwd(): string; chdir(dir: string): void };

// This test creates an isolated temporary search_index with multiple records whose
// embeddings are identical. It also mocks embedBatch for the query to return the
// same vector, guaranteeing tie scores. We then assert the k-slice size and that
// all scores are equal.

describe('search tie scores and k slice', () => {
  it('returns only k results and all scores tie', async () => {
    const prevCwd = process.cwd();
    const temp = mkdtempSync(join(tmpdir(), 'search-ties-'));
    const idxDir = join(temp, 'search_index');
    mkdirSync(idxDir, { recursive: true });
    const dim = 32; // smaller dimension sufficient & fast
    const ones = Array.from({ length: dim }, () => 1);
    const records = [
      { id: 'a', kind: 'content', source: 'fileA#0', text: 'Alpha', embedding: ones },
      { id: 'b', kind: 'content', source: 'fileB#0', text: 'Bravo', embedding: ones },
      { id: 'c', kind: 'content', source: 'fileC#0', text: 'Charlie', embedding: ones },
    ];
    writeFileSync(join(idxDir, 'content.json'), JSON.stringify(records, null, 2));
    writeFileSync(join(idxDir, 'code.json'), JSON.stringify([], null, 2));

    const spy = vi.spyOn(embeddings, 'embedBatch').mockImplementation(async (texts: string[]) => {
      return texts.map(() => ones);
    });

    try {
      process.chdir(temp);
      const k = 2;
      const results = await search('any query', k);
      expect(results.length).toBe(k);
      const uniqueScores = new Set(results.map((r) => r.score.toFixed(6)));
      expect(uniqueScores.size).toBe(1);
      // Ensure we sliced deterministically (stability of sort for equal keys)
      expect(results.map((r) => r.id)).toEqual(['a', 'b']);
    } finally {
      process.chdir(prevCwd);
      spy.mockRestore();
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
