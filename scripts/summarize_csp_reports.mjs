#!/usr/bin/env node
import { createReadStream, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

// This script expects concatenated JSON lines piped via stdin OR files in artifacts/csp_reports/*.jsonl (future storage)

const reportDir = 'artifacts/csp_reports';
const counts = new Map();
let total = 0;

async function processStream(stream) {
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const key = `${obj.effectiveDirective || obj.violatedDirective || 'unknown'}|${obj.blockedURI || 'none'}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      total++;
    } catch {
      // ignore
    }
  }
}

async function main() {
  if (process.stdin.isTTY && existsSync(reportDir)) {
    for (const f of readdirSync(reportDir)) {
      if (!f.endsWith('.jsonl')) continue;
      const full = join(reportDir, f);
      const st = statSync(full);
      if (!st.isFile()) continue;
      await processStream(createReadStream(full));
    }
  } else if (!process.stdin.isTTY) {
    await processStream(process.stdin);
  } else {
    console.error('No input provided');
    process.exit(1);
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => ({ key: k, count: v }));

  console.log(JSON.stringify({ total, distinct: counts.size, top }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
