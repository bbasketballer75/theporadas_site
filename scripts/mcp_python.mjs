#!/usr/bin/env node
// Python execution MCP server using shared harness.
// Method: py/exec { code } -> { stdout, stderr, exitCode, timeout }
import { spawn } from 'child_process';
import { register, createServer, appError } from './mcp_rpc_base.mjs';

function execPy(code, timeoutMs) {
  return new Promise((resolve) => {
    const proc = spawn(process.env.MCP_PYTHON_BIN || 'python', ['-c', code], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const to = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, timeoutMs);
    proc.stdout.on('data', (d) => (stdout += d.toString().slice(0, 10000 - stdout.length)));
    proc.stderr.on('data', (d) => (stderr += d.toString().slice(0, 8000 - stderr.length)));
    proc.on('close', (code) => {
      clearTimeout(to);
      resolve({ stdout, stderr, exitCode: killed ? -1 : code, timeout: killed });
    });
  });
}

createServer(() => {
  register('py/exec', async (params) => {
    if (!params?.code)
      throw appError(1000, 'code required', { domain: 'python', symbol: 'E_INVALID_PARAMS' });
    if (typeof params.code !== 'string' || params.code.length > 2000)
      throw appError(1005, 'code too large', {
        domain: 'python',
        symbol: 'E_INPUT_TOO_LARGE',
        details: String(params.code.length),
      });
    const timeoutMs = parseInt(process.env.MCP_PY_TIMEOUT_MS || '3000', 10);
    return await execPy(params.code, timeoutMs);
  });
});
