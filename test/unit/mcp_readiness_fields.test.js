/* eslint-env node */
import { spawn } from 'child_process';

import { describe, it, expect } from 'vitest';

/* global process */

function waitForReady(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout waiting for ready')), timeoutMs);
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      if (buf.includes('"type":"ready"') && buf.includes('"server"')) {
        clearTimeout(to);
        resolve(buf);
      }
    });
  });
}

describe('readiness line includes server + methods', () => {
  it('filesystem readiness has server field', async () => {
    const env = { ...process.env, DISABLE_MCP_KEEPALIVE: '1' };
    const child = spawn(process.execPath, ['scripts/mcp_filesystem.mjs'], { env });
    const out = await waitForReady(child);
    expect(out).toMatch(/"server":"fs"|"server":"filesystem"/);
    child.kill();
  });
});
