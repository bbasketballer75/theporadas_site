#!/usr/bin/env node
// Persistent minimal MCP server for Notion. Provides two stub JSON-RPC methods:
// notion/listDatabases and notion/retrievePage. Emits standard {type:'ready'} for harness.
import { Client } from '@notionhq/client';

import './load_env.mjs';
import './mcp_logging.mjs';
import { createServer } from './mcp_rpc_base.mjs';

if (!process.env.NOTION_API_KEY) {
  process.stdout.write(JSON.stringify({ type: 'error', error: 'NOTION_API_KEY not set' }) + '\n');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

createServer(({ register }) => {
  register('notion/listDatabases', async () => {
    const resp = await notion.search({ filter: { value: 'database', property: 'object' } });
    return { databases: resp.results.map((r) => ({ id: r.id })) };
  });

  register('notion/retrievePage', async (params) => {
    const id = params?.id;
    if (!id) throw new Error('Missing page id');
    const page = await notion.pages.retrieve({ page_id: id });
    return { page: { id: page.id, archived: page.archived } };
  });
});
