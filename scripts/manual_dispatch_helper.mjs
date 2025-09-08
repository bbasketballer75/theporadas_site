#!/usr/bin/env node
// Helper to append a no-op line to force a detectable change or provide context
// when manually dispatching the quality-history workflow without running full tests.
// Use cautiously; normally the workflow should run end-to-end.
import { appendFileSync } from 'node:fs';

const ts = new Date().toISOString();
appendFileSync(
  'quality-history.jsonl',
  JSON.stringify({ ts, manual: true, note: 'manual dispatch helper' }) + '\n',
);
console.log('[manual-dispatch] Appended manual placeholder entry at', ts);
