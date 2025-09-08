#!/usr/bin/env node
import { existsSync, readFileSync, appendFileSync } from 'node:fs';

const legacyPath = 'artifacts/quality-history.jsonl';
const targetPath = 'quality-history.jsonl';
if (!existsSync(legacyPath)) {
  console.log('[migrate-quality] No legacy file present. Nothing to do.');
  process.exit(0);
}

const existingCommits = new Set();
if (existsSync(targetPath)) {
  for (const line of readFileSync(targetPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
    try {
      const rec = JSON.parse(line);
      if (rec.commit) existingCommits.add(rec.commit + '|' + rec.ts);
    } catch {
      /* ignore parse errors for existing target */
    }
  }
}

let migrated = 0;
for (const line of readFileSync(legacyPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
  try {
    const rec = JSON.parse(line);
    const ts = rec.timestamp || new Date().toISOString();
    const commit = rec.git?.commit?.substring(0, 12) || 'LEGACY';
    const branch = rec.git?.branch || 'unknown';
    const coverage = rec.coverage
      ? {
          linesPct: rec.coverage.lines ?? null,
          statementsPct: rec.coverage.statements ?? null,
          functionsPct: rec.coverage.functions ?? null,
          branchesPct: rec.coverage.branches ?? null,
        }
      : undefined;
    const lighthouse = undefined; // legacy records lacked lighthouse score
    const key = commit + '|' + ts;
    if (existingCommits.has(key)) continue;
    appendFileSync(targetPath, JSON.stringify({ ts, commit, branch, coverage, lighthouse }) + '\n');
    migrated += 1;
  } catch (e) {
    console.warn('[migrate-quality] Skipping invalid legacy line:', e.message);
  }
}
console.log(`[migrate-quality] Migrated ${migrated} legacy records -> ${targetPath}`);
