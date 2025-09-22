import { spawn } from 'child_process';

import { describe, it, expect } from 'vitest';

describe('mcp_tavily optional mode', () => {
  it('starts and returns AUTH_FAILED when key missing in optional mode', async () => {
    const env = {
      ...globalThis.process.env,
      TAVILY_API_KEY: '',
      TAVILY_OPTIONAL: '1',
      DISABLE_MCP_KEEPALIVE: '1',
    };
    const child = spawn(globalThis.process.execPath, ['scripts/mcp_tavily.mjs'], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('timeout waiting for ready')), 5000);
      child.stdout.on('data', () => {
        if (stdout.includes('"type":"ready"')) {
          clearTimeout(to);
          resolve();
        }
      });
    });

    const req = { jsonrpc: '2.0', id: 1, method: 'tv/search', params: { query: 'test' } };
    child.stdin.write(JSON.stringify(req) + '\n');

    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('timeout waiting for response')), 5000);
      child.stdout.on('data', () => {
        if (stdout.includes('E_TV_AUTH_FAILED') || stdout.includes('AUTH_FAILED')) {
          clearTimeout(to);
          resolve();
        }
      });
    });

    expect(child.exitCode).toBeNull();
    child.kill();
    expect(stderr).toContain('optional mode');
  });
});
