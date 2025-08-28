#!/usr/bin/env node
import { createServer, appError } from './mcp_rpc_base.mjs';

createServer(({ register }) => {
  register('ok/ping', async (p) => ({ pong: true, echo: p || null }));
  register('err/fail', async () => {
    throw appError(1234, 'Synthetic failure', { domain: 'test', symbol: 'E_SYN' });
  });
});
