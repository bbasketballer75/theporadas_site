#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

// Reads hashes JSON from stdin (output of generate_csp_hashes.mjs) and updates style-src / script-src directives.
// Only adds hashes not already present. Exits 0 if no changes.

const vercelFile = 'vercel.json';

function parseCsp(value) {
  const directives = {};
  value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [name, ...rest] = part.split(/\s+/);
      directives[name] = rest;
    });
  return directives;
}
function serializeCsp(directives) {
  return (
    Object.entries(directives)
      .map(([k, v]) => `${k} ${v.join(' ')}`)
      .join('; ') + ';'
  );
}

function run() {
  const input = readFileSync(0, 'utf8');
  let hashes;
  try {
    hashes = JSON.parse(input);
  } catch {
    console.error('Invalid JSON input');
    process.exit(2);
  }
  const json = JSON.parse(readFileSync(vercelFile, 'utf8'));
  const headerGroup = json.headers.find((h) => h.source === '/(.*)');
  if (!headerGroup) {
    console.error('No /(.*) header group');
    process.exit(1);
  }
  const cspHeader = headerGroup.headers.find((h) => h.key === 'Content-Security-Policy');
  if (!cspHeader) {
    console.error('CSP header not found');
    process.exit(1);
  }
  const directives = parseCsp(cspHeader.value);
  let changed = false;
  if (hashes.script?.length) {
    const existing = new Set(directives['script-src'] || []);
    hashes.script.forEach((h) => {
      if (!existing.has(h)) {
        existing.add(h);
        changed = true;
      }
    });
    directives['script-src'] = Array.from(existing);
  }
  if (hashes.style?.length) {
    const existing = new Set(directives['style-src'] || []);
    hashes.style.forEach((h) => {
      if (!existing.has(h)) {
        existing.add(h);
        changed = true;
      }
    });
    directives['style-src'] = Array.from(existing);
  }
  if (!changed) {
    console.log('No changes to CSP.');
    return;
  }
  cspHeader.value = serializeCsp(directives);
  writeFileSync(vercelFile, JSON.stringify(json, null, 2) + '\n');
  console.log('CSP updated with hashes.');
}

run();
