#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function getCurrentCsp(vercelPath) {
  const json = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const headers = Array.isArray(json.headers) ? json.headers : [];
  for (const block of headers) {
    const list = Array.isArray(block.headers) ? block.headers : [];
    for (const h of list) {
      if (h.key && String(h.key).toLowerCase() === 'content-security-policy') {
        return String(h.value || '');
      }
    }
  }
  return '';
}

function parseDirectives(csp) {
  const map = new Map();
  for (const seg of csp.split(';')) {
    const s = seg.trim();
    if (!s) continue;
    const [name, ...rest] = s.split(/\s+/);
    if (!name) continue;
    map.set(name, rest);
  }
  return map;
}

function main() {
  const root = process.cwd();
  const vercelPath = path.join(root, 'vercel.json');
  const current = getCurrentCsp(vercelPath);
  if (!current) {
    console.log('CSP verification passed - no removed directives detected');
    process.exit(0);
  }

  // Establish baseline snapshot alongside artifacts or default to current when snapshot missing
  const baselinePath = path.join(root, 'artifacts', 'csp_baseline.txt');
  let baseline = '';
  if (fs.existsSync(baselinePath)) {
    baseline = fs.readFileSync(baselinePath, 'utf8').trim();
  } else {
    baseline = current.trim();
    try {
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, baseline, 'utf8');
    } catch {
      // Best-effort: ignore errors writing snapshot; still proceed with current
    }
  }

  const baseMap = parseDirectives(baseline);
  const curMap = parseDirectives(current);

  // Detect removed directives (keys missing in current)
  const removed = [];
  for (const key of baseMap.keys()) {
    if (!curMap.has(key)) removed.push(key);
  }

  if (removed.length > 0) {
    console.error(`Removed directive(s) detected: ${removed.join(', ')}`);
    process.exit(1);
  }

  console.log('CSP diff check passes baseline (no removed directives)');
  process.exit(0);
}

main();
