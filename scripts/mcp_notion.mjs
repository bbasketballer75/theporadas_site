#!/usr/bin/env node
// Persistent minimal MCP server for Notion. Provides two stub JSON-RPC methods:
// notion/listDatabases and notion/retrievePage. Emits standard {type:'ready'} for harness.
import './load_env.mjs';
import './mcp_logging.mjs';
import { Client } from '@notionhq/client';

if (!process.env.NOTION_API_KEY) {
  process.stdout.write(JSON.stringify({ type: 'error', error: 'NOTION_API_KEY not set' }) + '\n');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const methods = ['notion/listDatabases', 'notion/retrievePage'];
process.stdout.write(
  JSON.stringify({ type: 'ready', methods, schema: { service: 'notion', version: 1 } }) + '\n',
);

process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', async (chunk) => {
  buf += chunk;
  const lines = buf.split(/\n/);
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.jsonrpc !== '2.0' || !msg.method) continue;
    try {
      if (msg.method === 'notion/listDatabases') {
        const resp = await notion.search({ filter: { value: 'database', property: 'object' } });
        sendResult(msg.id, { databases: resp.results.map((r) => ({ id: r.id })) });
      } else if (msg.method === 'notion/retrievePage') {
        const id = msg.params?.id;
        if (!id) return sendError(msg.id, 'INVALID_PARAMS', 'Missing page id');
        const page = await notion.pages.retrieve({ page_id: id });
        sendResult(msg.id, { page: { id: page.id, archived: page.archived } });
      } else if (msg.method.match(/listMethods$/i)) {
        sendResult(msg.id, { methods });
      } else {
        sendError(msg.id, 'NOT_IMPLEMENTED', 'Unknown method');
      }
    } catch (e) {
      sendError(msg.id, 'INTERNAL', e.message || 'Notion error');
    }
  }
});

function sendResult(id, result) {
  if (id === undefined) return;
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function sendError(id, code, message) {
  if (id === undefined) return;
  process.stdout.write(
    JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, data: { code }, message } }) + '\n',
  );
}
