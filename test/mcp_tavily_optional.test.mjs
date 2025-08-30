import { spawn } from 'child_process';
import { describe, it, expect } from 'vitest';

// This test verifies the tavily server does NOT exit immediately when started
// without an API key if TAVILY_OPTIONAL=1 is set. It should emit a ready line
// and keep process alive briefly so we can send a request and receive AUTH_FAILED.

describe('mcp_tavily optional mode', () => {
  it('starts and returns AUTH_FAILED when key missing in optional mode', async () => {
    const env = {
      ...process.env,
      TAVILY_API_KEY: '',
      TAVILY_OPTIONAL: '1',
      DISABLE_MCP_KEEPALIVE: '1',
    };
    const child = spawn(process.execPath, ['scripts/mcp_tavily.mjs'], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    // Wait for ready sentinel
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('timeout waiting for ready')), 5000);
      child.stdout.on('data', () => {
        if (stdout.includes('"type":"ready"')) {
          clearTimeout(to);
          resolve();
        }
      });
    });

    // Send a JSON-RPC request
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

    // Ensure process still alive briefly then kill
    expect(child.exitCode).toBeNull();
    child.kill();
    expect(stderr).toContain('optional mode');
  });
});
