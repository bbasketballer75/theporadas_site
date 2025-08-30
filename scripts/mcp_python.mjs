#!/usr/bin/env node
// Python execution MCP server using shared harness.
// Method: py/exec { code } -> { stdout, stderr, exitCode, timeout }
import './mcp_logging.mjs';
import { spawn } from 'child_process';
import { register, createServer } from './mcp_rpc_base.mjs';
import { pyError } from './mcp_error_codes.mjs';
import { appError } from './mcp_rpc_base.mjs';

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
    if (!params?.code) throw pyError('INVALID_PARAMS', { details: 'code required' });
    if (typeof params.code !== 'string')
      throw pyError('INVALID_PARAMS', { details: 'code must be string' });
    if (params.code.length > 2000)
      throw appError(1005, 'code too large', { domain: 'python', symbol: 'E_INPUT_TOO_LARGE' });
    const timeoutMs = parseInt(process.env.MCP_PY_TIMEOUT_MS || '3000', 10);
    return await execPy(params.code, timeoutMs);
  });
});
