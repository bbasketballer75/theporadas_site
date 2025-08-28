#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const root = process.cwd();
const vercelPath = path.join(root, 'vercel.json');
const baselinePath = path.join(root, 'security', 'csp_baseline.json');

if (!fs.existsSync(vercelPath)) {
  console.error('[csp:verify] vercel.json not found');
  process.exit(2);
}
if (!fs.existsSync(baselinePath)) {
  console.error('[csp:verify] baseline file missing at security/csp_baseline.json');
  process.exit(2);
}

const vercel = loadJSON(vercelPath);
const baseline = loadJSON(baselinePath);
const baselineCsp = baseline.contentSecurityPolicy.trim();

function extractCsp(v) {
  const headers = (v.headers || []).flatMap((h) => h.headers || []);
  const csp = headers.find((h) => h.key === 'Content-Security-Policy');
  return csp ? csp.value.trim() : '';
}
const currentCsp = extractCsp(vercel);

if (!currentCsp) {
  console.error('[csp:verify] No Content-Security-Policy header found in vercel.json');
  process.exit(3);
}

// Parse into directive maps
function toMap(csp) {
  const map = new Map();
  csp
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [dir, ...rest] = part.split(/\s+/);
      map.set(dir, rest.join(' '));
    });
  return map;
}

const baseMap = toMap(baselineCsp);
const currentMap = toMap(currentCsp);

let errors = [];

// Ensure no directive removed
for (const dir of baseMap.keys()) {
  if (!currentMap.has(dir)) errors.push(`Removed directive: ${dir}`);
}

// For overlapping directives, ensure current does not broaden relative to baseline for critical ones.
const STRICT_DIRS = [
  'default-src',
  'script-src',
  'style-src',
  'object-src',
  'frame-ancestors',
  'base-uri',
  'form-action',
];
function tokenize(val) {
  return val.split(/\s+/).filter(Boolean).sort();
}
for (const dir of STRICT_DIRS) {
  if (baseMap.has(dir) && currentMap.has(dir)) {
    const baseVals = new Set(tokenize(baseMap.get(dir)));
    const currVals = new Set(tokenize(currentMap.get(dir)));
    for (const v of currVals) {
      if (!baseVals.has(v)) {
        // Allow additions if they are hashes (sha256-...) or 'report-uri' is separate directive; treat those as acceptable.
        if (/^'sha256-/.test(v) || /^sha256-/.test(v)) continue;
        errors.push(`Directive ${dir} broadened with value: ${v}`);
      }
    }
  }
}

if (errors.length) {
  console.error('[csp:verify] CSP changes rejected:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}

console.log('[csp:verify] CSP passes baseline restrictions');
