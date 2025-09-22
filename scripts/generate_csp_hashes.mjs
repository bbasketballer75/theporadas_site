#!/usr/bin/env node
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const hashes = { script: [], style: [] };

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.html?$/i.test(entry)) inspect(full);
  }
}

function sha256(content) {
  return createHash('sha256').update(content).digest('base64');
}

function inspect(file) {
  const html = readFileSync(file, 'utf8');
  const scriptMatches = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  scriptMatches.forEach((tag) => {
    const body = tag.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    const trimmed = body.trim();
    if (trimmed) hashes.script.push(`'sha256-${sha256(trimmed)}'`);
  });
  styleMatches.forEach((tag) => {
    const body = tag.replace(/^[\s\S]*?>/, '').replace(/<\/style>$/i, '');
    const trimmed = body.trim();
    if (trimmed) hashes.style.push(`'sha256-${sha256(trimmed)}'`);
  });
}

walk(distDir);

const uniqueScripts = [...new Set(hashes.script)].sort();
const uniqueStyles = [...new Set(hashes.style)].sort();

console.log(JSON.stringify({ script: uniqueScripts, style: uniqueStyles }, null, 2));

if ((uniqueScripts.length || uniqueStyles.length) && process.env.FAIL_ON_INLINE === '1') {
  console.error('Inline script/style found; failing due to FAIL_ON_INLINE=1');
  process.exit(1);
}
