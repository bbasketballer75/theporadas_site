import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

describe('supervisor + sse integration', () => {
  it('starts SSE gateway and exposes metrics endpoint', async () => {
    const env = { ...process.env, MCP_SSE_PORT: '39401' };
    const proc = spawn(process.execPath, ['scripts/mcp_sse_gateway.mjs'], { env });
    let ready = false;
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (c) => {
      if (!ready && c.toString().includes('"type":"ready"')) ready = true;
    });
    const start = Date.now();
    while (!ready && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(ready).toBe(true);
    const res = await fetch('http://127.0.0.1:39401/metrics/sse');
    expect(res.status).toBe(200);
    proc.kill();
  });
});
