#!/usr/bin/env node
/**
 * Post-process Istanbul/Vitest HTML coverage summary to ensure all <th> elements
 * have accessible, descriptive text (avoid axe empty-table-header rule).
 * We cannot modify Istanbul's internal template easily without forking; so we
 * patch the generated index.html in-place. Script is idempotent.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Allow override for testing or custom location via COVERAGE_HTML env var.
const SILENT =
  process.env.COVERAGE_A11Y_SILENT === '1' || process.env.COVERAGE_A11Y_SILENT === 'true';
const STRICT =
  process.env.COVERAGE_A11Y_STRICT === '1' || process.env.COVERAGE_A11Y_STRICT === 'true';
function gatherCoverageHtmlFiles() {
  if (process.env.COVERAGE_HTML) {
    const single = resolve(process.env.COVERAGE_HTML);
    return existsSync(single) ? [single] : [];
  }
  const baseDir = resolve('coverage');
  if (!existsSync(baseDir)) return [];
  const results = [];
  function walk(dir) {
    let entries = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const full = join(dir, name);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full); else if (st.isFile() && name === 'index.html') results.push(full);
    }
  }
  walk(baseDir);
  return results;
}
const files = gatherCoverageHtmlFiles();
if (!files.length) {
  if (!SILENT) console.warn('[fix_coverage_a11y] no coverage HTML files found; skipping');
  process.exit(0);
}

// (single-file legacy logic removed; processing happens inside loop)

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
let globalFailures = [];
for (const reportPath of files) {
  let html;
  try { html = readFileSync(reportPath, 'utf8'); } catch (e) {
    console.error('[fix_coverage_a11y] failed reading', reportPath, e.message);
    if (STRICT) process.exit(1); else continue;
  }
  let modified = false;
  for (const [dataCol, label] of Object.entries(headerLabelMap)) {
    const pattern = new RegExp(`(<th[^>]*data-col="${dataCol}"[^>]*>)(?:\\s*)</th>`, 'gi');
    const before = html;
    html = html.replace(pattern, (m, openTag) => `${openTag}${label}</th>`);
    if (html !== before) {
      modified = true;
      if (!SILENT) console.log(`[fix_coverage_a11y] ensured header for data-col="${dataCol}" in ${reportPath}`);
    }
  }
  if (modified) {
    try { writeFileSync(reportPath, html); } catch (e) {
      console.error('[fix_coverage_a11y] failed writing', reportPath, e.message);
      if (STRICT) process.exit(1);
    }
  }
  if (STRICT) {
    const stillEmpty = [];
    for (const dataCol of Object.keys(headerLabelMap)) {
      const thPattern = new RegExp(`<th[^>]*data-col="${dataCol}"[^>]*>(.*?)</th>`, 'i');
      const m = html.match(thPattern);
      if (!m || !m[1] || !m[1].trim()) stillEmpty.push(dataCol);
    }
    if (stillEmpty.length) globalFailures.push({ file: reportPath, cols: stillEmpty });
  }
}
if (STRICT) {
  if (globalFailures.length) {
    for (const f of globalFailures) console.error('[fix_coverage_a11y][STRICT] Missing labels in', f.file, 'for data-col:', f.cols.join(', '));
    process.exit(2);
  } else if (!SILENT) {
    console.log('[fix_coverage_a11y][STRICT] All targeted headers labeled in all files.');
  }
}

