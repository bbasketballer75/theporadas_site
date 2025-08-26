#!/usr/bin/env node
// Minimal placeholder MCP-style server for Notion (stub)
import { Client } from '@notionhq/client';
import { out, fail } from './mcp_util.mjs';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
// This is a stub; real MCP integration would expose tools via stdout/stdio protocol.
if (!process.env.NOTION_API_KEY) fail('NOTION_API_KEY not set');
out({ notice: 'Notion MCP stub started', capabilities: ['list-databases', 'retrieve-page'] });
