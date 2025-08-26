#!/usr/bin/env node
// Usage: npm run a11y:best:enforce
// Env:
//   A11Y_BEST_OUTPUT_PATH (default artifacts/axe-best-practices-violations.json)
//   A11Y_BEST_ENFORCE=1 to enable failing behavior
//   A11Y_THRESHOLD_HEADING_ORDER / A11Y_THRESHOLD_REGION (defaults 0)
// Exits non-zero if any rule count exceeds its threshold when enforcement enabled.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Configuration via env vars
const PATH = process.env.A11Y_BEST_OUTPUT_PATH || 'artifacts/axe-best-practices-violations.json';
const ENFORCE = process.env.A11Y_BEST_ENFORCE === '1' || process.env.A11Y_BEST_ENFORCE === 'true';
// Thresholds per rule (defaults 0 = no violations allowed when enforcing)
const THRESHOLDS = {
  'heading-order': parseInt(process.env.A11Y_THRESHOLD_HEADING_ORDER || '0', 10),
  region: parseInt(process.env.A11Y_THRESHOLD_REGION || '0', 10),
};

function loadViolations(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[axe_best_enforce] Failed to parse JSON', e);
    return null;
  }
}

function summarize(data) {
  if (!data || !Array.isArray(data.violations)) return { counts: {}, total: 0 };
  const counts = {};
  for (const v of data.violations) {
    counts[v.id] = (counts[v.id] || 0) + 1; // count per violation entry (not per node)
  }
  return { counts, total: data.violations.length };
}

function formatSummary(summary) {
  const lines = ['Axe Best-Practice Violations Summary'];
  if (!summary.total) {
    lines.push('  None found.');
  } else {
    for (const [rule, count] of Object.entries(summary.counts)) {
      const threshold = THRESHOLDS[rule] ?? 0;
      lines.push(`  ${rule}: ${count} (threshold ${threshold})`);
    }
    lines.push(`  Total: ${summary.total}`);
  }
  return lines.join('\n');
}

function main() {
  const filePath = resolve(process.cwd(), PATH);
  const data = loadViolations(filePath);
  if (!data) {
    console.log('[axe_best_enforce] No violations file found at', filePath);
    if (ENFORCE) {
      console.log('[axe_best_enforce] Enforcement mode on but no file => treating as pass.');
    }
    return;
  }
  const summary = summarize(data);
  console.log(formatSummary(summary));
  if (!ENFORCE) {
    console.log('[axe_best_enforce] Enforcement disabled (set A11Y_BEST_ENFORCE=1 to enable).');
    return;
  }
  // Evaluate thresholds
  let failed = false;
  for (const [rule, threshold] of Object.entries(THRESHOLDS)) {
    const actual = summary.counts[rule] || 0;
    if (actual > threshold) {
      failed = true;
      console.error(
        `[axe_best_enforce] Rule ${rule} has ${actual} violations (threshold ${threshold})`,
      );
    }
  }
  if (failed) {
    console.error('[axe_best_enforce] Accessibility best-practice enforcement FAILED.');
    process.exitCode = 1;
  } else {
    console.log('[axe_best_enforce] All best-practice thresholds satisfied.');
  }
}

main();
