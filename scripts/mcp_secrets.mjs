#!/usr/bin/env node
// Secrets manager MCP server. Exposes allowlisted environment variables.
// Methods:
//  sec/list -> { keys:[] }
//  sec/get { key } -> { key, value }
//  sec/refresh -> { reloaded }
// Allowlist from SECRETS_ALLOWLIST (comma-separated). If not set, read .env and expose no secrets.

import './load_env.mjs';
import { createServer, appError } from './mcp_rpc_base.mjs';
import { readFileSync, existsSync } from 'fs';

let allow = new Set();
function loadAllow() {
  allow = new Set(
    (process.env.SECRETS_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
loadAllow();

function listKeys() {
  return Array.from(allow.values());
}

function getSecret(k) {
  if (!allow.has(k)) throw appError(2500, 'not allowed', { domain: 'secrets', symbol: 'E_DENY' });
  return process.env[k] || null;
}

createServer(({ register }) => {
  register('sec/list', () => ({ keys: listKeys() }));
  register('sec/get', (p = {}) => {
    if (!p.key) throw appError(2501, 'key required', { domain: 'secrets', symbol: 'E_PARAMS' });
    return { key: p.key, value: getSecret(p.key) };
  });
  register('sec/refresh', () => {
    loadAllow();
    return { reloaded: true };
  });
});
