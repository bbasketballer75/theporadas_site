#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const silent = process.env.COVERAGE_A11Y_SILENT === '1';
const strict = process.env.COVERAGE_A11Y_STRICT === '1';
const htmlPath = process.env.COVERAGE_HTML || 'coverage/index.html';

function log(msg) {
  if (!silent) console.log(msg);
}

function labelEmptyHeaders(html) {
  let out = html;
  const replacements = [
    { pattern: /(<th[^>]*data-col="statements_raw"[^>]*>)(\s*)<\/th>/i, label: 'Statements Raw' },
    { pattern: /(<th[^>]*data-col="branches_raw"[^>]*>)(\s*)<\/th>/i, label: 'Branches Raw' },
    { pattern: /(<th[^>]*data-col="functions_raw"[^>]*>)(\s*)<\/th>/i, label: 'Functions Raw' },
    { pattern: /(<th[^>]*data-col="lines_raw"[^>]*>)(\s*)<\/th>/i, label: 'Lines Raw' },
  ];
  for (const { pattern, label } of replacements) {
    out = out.replace(pattern, `$1${label}</th>`);
  }
  // Inject a title near the summary table if not present
  if (!/Coverage Chart/i.test(out)) {
    out = out.replace(/(<table[^>]*class="coverage-summary"[^>]*>)/i, '<h1>Coverage Chart</h1>$1');
  }
  return out;
}

function main() {
  if (!fs.existsSync(htmlPath)) {
    log(`Coverage a11y: file not found: ${htmlPath}`);
    process.exit(0);
  }
  const before = fs.readFileSync(htmlPath, 'utf8');
  const after = labelEmptyHeaders(before);
  fs.writeFileSync(htmlPath, after, 'utf8');

  if (strict) {
    const mustContain = [
      'Coverage Chart',
      'Statements Raw',
      'Branches Raw',
      'Functions Raw',
      'Lines Raw',
    ];
    const ok = mustContain.every((s) => after.includes(s));
    if (!ok) {
      console.error('Coverage a11y strict mode failed: missing labels');
      process.exit(1);
    }
  }
  log('Coverage a11y fix completed successfully.');
}

main();
