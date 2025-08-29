#!/usr/bin/env node
// Pieces MCP server: provides minimal integration placeholder.
// Extend with real Pieces API interactions once SDK or HTTP endpoints integrated.
import { register, createServer } from './mcp_rpc_base.mjs';
import { appError } from './mcp_rpc_base.mjs';

const API_KEY = process.env.PIECES_API_KEY || '';

createServer(() => {
  register('pieces/ping', async () => ({ pong: true, ts: Date.now() }));
  register('pieces/info', async () => ({
    haveApiKey: Boolean(API_KEY),
    maskedKey: API_KEY ? API_KEY.slice(0, 4) + '***' : null,
  }));
  register('pieces/requireKey', async () => {
    if (!API_KEY)
      throw appError(2101, 'API key required', {
        domain: 'pieces',
        symbol: 'NO_KEY',
        retryable: true,
      });
    return { ok: true };
  });
});
