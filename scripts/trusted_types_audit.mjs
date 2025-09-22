#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const roots = ['src'];
const riskyPatterns = [
  /innerHTML\s*=/,
  /outerHTML\s*=/,
  /dangerouslySetInnerHTML\s*:/,
  /new Function\(/,
  /eval\(/,
  /setTimeout\(\s*['"`]/,
  /setInterval\(\s*['"`]/,
];

let findings = [];

function walk(dir) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/i.test(e)) inspect(full);
  }
}
function inspect(file) {
  const content = readFileSync(file, 'utf8');
  riskyPatterns.forEach((p) => {
    if (p.test(content)) {
      const lines = content.split(/\r?\n/);
      lines.forEach((ln, i) => {
        if (p.test(ln)) findings.push({ file, line: i + 1, match: p.source });
      });
    }
  });
}
roots.forEach((r) => walk(r));

if (findings.length) {
  console.log(JSON.stringify({ findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log('No risky sinks detected for Trusted Types hard enforcement.');
}
