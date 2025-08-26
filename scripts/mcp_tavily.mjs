#!/usr/bin/env node
// Minimal placeholder MCP-style server for Tavily (stub)
import fetch from 'node-fetch';
import { out, fail } from './mcp_util.mjs';

const key = process.env.TAVILY_API_KEY;
if (!key) fail('TAVILY_API_KEY not set');
async function search(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
const q = process.argv.slice(2).join(' ') || 'Model Context Protocol';
search(q)
  .then((r) => {
    out({ notice: 'Tavily MCP stub result', query: q, result: r });
  })
  .catch((e) => fail(e.message || String(e)));
