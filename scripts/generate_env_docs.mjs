#!/usr/bin/env node
// Scans repository for process.env.<VAR> patterns and updates docs/mcp_servers.md
// between AUTO-GENERATED ENV VARS markers. Supports --check to verify no drift.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DOC_PATH = path.resolve('docs/mcp_servers.md');
const START_MARK = '<!-- ENV_VARS_AUTO_START -->';
const END_MARK = '<!-- ENV_VARS_AUTO_END -->';

const CHECK = process.argv.includes('--check');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (st.isFile() && /\.(mjs|js|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.resolve('.'));
const varInfo = new Map(); // VAR -> { files: Set, samples: Set }
const ENV_PATTERN = /process\.env\.([A-Z0-9_]+)/g;

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = ENV_PATTERN.exec(text))) {
    const v = m[1];
    if (!varInfo.has(v)) varInfo.set(v, { files: new Set(), samples: new Set() });
    varInfo.get(v).files.add(path.relative('.', f));
    // capture nearby context for description heuristics (line comment)
    const before = text.slice(Math.max(0, m.index - 120), m.index + v.length + 30);
    const commentMatch = before.match(/\/\/[^\n]*$/m);
    if (commentMatch) varInfo.get(v).samples.add(commentMatch[0].replace(/\/\//, '').trim());
  }
}

// Basic classification heuristics
function classify(name) {
  if (name.endsWith('_API_KEY')) return 'API key';
  if (name.includes('TIMEOUT')) return 'Timeout (ms)';
  if (name.includes('LIMIT') || name.includes('MAX_')) return 'Limit / bound';
  if (name.startsWith('MCP_')) return 'MCP harness';
  return 'General';
}

const rows = [...varInfo.keys()]
  .sort()
  .map((v) => {
    const info = varInfo.get(v);
    const descParts = [];
    if (info.samples.size) descParts.push([...info.samples][0]);
    const classification = classify(v);
    if (!descParts.length) descParts.push(classification);
    else if (!descParts[0].toLowerCase().includes(classification.toLowerCase()))
      descParts.push(classification);
    return `| \`${v}\` | ${descParts.join(' — ')} | ${[...info.files].slice(0, 3).join(', ')} |`;
  });

const table = [
  '| Variable | Description (heuristic) | Seen In |',
  '| -------- | ----------------------- | ------- |',
  ...rows,
].join('\n');

if (!fs.existsSync(DOC_PATH)) {
  console.error('Doc file not found:', DOC_PATH);
  process.exit(2);
}
const doc = fs.readFileSync(DOC_PATH, 'utf8');
if (!doc.includes(START_MARK) || !doc.includes(END_MARK)) {
  console.error('Markers missing in docs/mcp_servers.md. Please insert start/end markers.');
  process.exit(3);
}

const newBlock = `${START_MARK}\n\n${table}\n\n${END_MARK}`;
const updated = doc.replace(
  new RegExp(`${START_MARK}[\s\S]*?${END_MARK}`),
  newBlock,
);

if (CHECK) {
  if (updated !== doc) {
    console.error('Environment variable docs are out of date. Run: npm run env:docs');
    process.exit(1);
  } else {
    console.log('Env var docs up to date.');
  }
  process.exit(0);
}

if (updated !== doc) {
  fs.writeFileSync(DOC_PATH, updated);
  console.log('Updated env var docs.');
} else {
  console.log('No changes needed.');
}