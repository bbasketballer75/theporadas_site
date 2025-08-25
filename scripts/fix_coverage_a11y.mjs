#!/usr/bin/env node
/**
 * Post-process Istanbul/Vitest HTML coverage summary to ensure all <th> elements
 * have accessible, descriptive text (avoid axe empty-table-header rule).
 * We cannot modify Istanbul's internal template easily without forking; so we
 * patch the generated index.html in-place. Script is idempotent.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Allow override for testing or custom location via COVERAGE_HTML env var.
const SILENT =
  process.env.COVERAGE_A11Y_SILENT === '1' || process.env.COVERAGE_A11Y_SILENT === 'true';
const STRICT =
  process.env.COVERAGE_A11Y_STRICT === '1' || process.env.COVERAGE_A11Y_STRICT === 'true';
const reportPath = process.env.COVERAGE_HTML
  ? resolve(process.env.COVERAGE_HTML)
  : resolve('coverage', 'index.html');
if (!existsSync(reportPath)) {
  if (!SILENT) console.warn('[fix_coverage_a11y] coverage/index.html not found; skipping');
  process.exit(0);
}

let html;
try {
  html = readFileSync(reportPath, 'utf8');
} catch (e) {
  console.error('[fix_coverage_a11y] failed reading coverage report:', e.message);
  process.exit(1);
}

// Map data-col attribute values that may be empty in upstream template to labels.
// We already have File, Statements, Branches, Functions, Lines labeled; we ensure raw & pic columns.
const headerLabelMap = {
  pic: 'Coverage Chart',
  statements_raw: 'Statements Raw',
  branches_raw: 'Branches Raw',
  functions_raw: 'Functions Raw',
  lines_raw: 'Lines Raw',
};

// Replace any targeted header whose inner text is only whitespace to remain idempotent.
for (const [dataCol, label] of Object.entries(headerLabelMap)) {
  const pattern = new RegExp(`(<th[^>]*data-col="${dataCol}"[^>]*>)(?:\\s*)</th>`, 'gi');
  const before = html;
  html = html.replace(pattern, (m, openTag) => `${openTag}${label}</th>`);
  if (html !== before && !SILENT) {
    console.log(`[fix_coverage_a11y] ensured header for data-col="${dataCol}"`);
  }
}

try {
  writeFileSync(reportPath, html);
} catch (e) {
  console.error('[fix_coverage_a11y] failed writing coverage report:', e.message);
  process.exit(1);
}

// STRICT mode: verify all targeted headers now have non-empty text, otherwise exit 1.
if (STRICT) {
  const stillEmpty = [];
  for (const dataCol of Object.keys(headerLabelMap)) {
    const thPattern = new RegExp(`<th[^>]*data-col="${dataCol}"[^>]*>(.*?)</th>`, 'i');
    const m = html.match(thPattern);
    if (!m || !m[1] || !m[1].trim()) stillEmpty.push(dataCol);
  }
  if (stillEmpty.length) {
    console.error(
      '[fix_coverage_a11y][STRICT] Missing labels for data-col:',
      stillEmpty.join(', '),
    );
    process.exit(2);
  } else if (!SILENT) {
    console.log('[fix_coverage_a11y][STRICT] All targeted headers labeled.');
  }
}
