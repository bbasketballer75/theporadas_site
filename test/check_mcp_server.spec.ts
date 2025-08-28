import { spawn } from 'child_process';
import process from 'node:process';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

function runProbe(args: string[], env: Record<string, string | undefined> = {}) {
  return new Promise<{ code: number; stderr: string }>((resolve) => {
    const proc = spawn('node', [join('scripts', 'check_mcp_server.mjs'), ...args], {
      env: { ...process.env, ...env },
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => resolve({ code: code ?? -1, stderr }));
  });
}

// We'll reuse the deterministic test metrics server for readiness & RPC tests
const testServerCmd = 'node scripts/mcp_test_metrics.mjs';

describe('check_mcp_server', () => {
  it('succeeds on ready only', async () => {
    const r = await runProbe(['--cmd', testServerCmd, '--timeout', '3000']);
    expect(r.code).toBe(0);
  });

  it('fails when expected method missing', async () => {
    const r = await runProbe([
      '--cmd',
      testServerCmd,
      '--timeout',
      '3000',
      '--expect-methods',
      'nonexistent_method',
    ]);
    expect(r.code).toBe(4);
    expect(r.stderr).toMatch(/missing methods/);
  });

  it('rpc call success path', async () => {
    const r = await runProbe(['--cmd', testServerCmd, '--timeout', '3000', '--rpc', 'ok/ping']);
    expect(r.code).toBe(0);
  });

  it('rpc call error path', async () => {
    const r = await runProbe(['--cmd', testServerCmd, '--timeout', '3000', '--rpc', 'err/fail']);
    expect(r.code).toBe(3);
    expect(r.stderr).toMatch(/rpc error/);
  });

  it('ready timeout', async () => {
    // Spawn a process that never outputs ready sentinel
    const r = await runProbe(['--cmd', 'node -e "setTimeout(()=>{},1000)"', '--timeout', '100']);
    expect(r.code).toBe(2);
  });
});
