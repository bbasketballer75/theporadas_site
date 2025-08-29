import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

// Ensures docs/mcp_servers.md env var index is current.

describe('env docs generation', () => {
  it('is up to date (run npm run env:docs to refresh)', () => {
    const res = spawnSync('node', ['scripts/generate_env_docs.mjs', '--check'], {
      encoding: 'utf8',
    });
    if (res.status !== 0) {
      // Include stdout+stderr for diff visibility
      throw new Error(
        `Env docs out of date. Exit ${res.status}\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`,
      );
    }
    expect(res.status).toBe(0);
  });
});
