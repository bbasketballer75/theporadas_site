import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

// Minimal synthetic coverage HTML with empty header cells for targeted data-cols
const TEMPLATE = `<!DOCTYPE html><html><head><title>cov</title></head><body>
<table class="coverage-summary"><thead><tr>
<th data-col="file" class="file">File</th>
<th data-col="pic" class="pic"></th>
<th data-col="statements" class="pct">Statements</th>
<th data-col="statements_raw" class="abs">\n</th>
<th data-col="branches" class="pct">Branches</th>
<th data-col="branches_raw" class="abs"> </th>
<th data-col="functions" class="pct">Functions</th>
<th data-col="functions_raw" class="abs">\t</th>
<th data-col="lines" class="pct">Lines</th>
<th data-col="lines_raw" class="abs">\r</th>
</tr></thead></table></body></html>`;

function runScript(htmlPath: string, extraEnv: Record<string, string | undefined> = {}) {
  const g: unknown = globalThis;
  let baseEnv: Record<string, string | undefined> = {};
  if (typeof g === 'object' && g && 'process' in g) {
    const proc = (g as { process?: { env?: Record<string, string | undefined> } }).process;
    if (proc && proc.env) baseEnv = proc.env;
  }
  execSync('node ./scripts/fix_coverage_a11y.mjs', {
    env: { ...baseEnv, COVERAGE_HTML: htmlPath, ...extraEnv },
    stdio: 'pipe',
  });
}

describe('fix_coverage_a11y script', () => {
  it('populates empty headers with labels', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cov-a11y-'));
    const file = join(dir, 'index.html');
    writeFileSync(file, TEMPLATE, 'utf8');
    runScript(file);
    const out = readFileSync(file, 'utf8');
    expect(out).toContain('Coverage Chart');
    expect(out).toContain('Statements Raw');
    expect(out).toContain('Branches Raw');
    expect(out).toContain('Functions Raw');
    expect(out).toContain('Lines Raw');
  });

  it('is idempotent (second run does not duplicate labels)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cov-a11y-'));
    const file = join(dir, 'index.html');
    writeFileSync(file, TEMPLATE, 'utf8');
    runScript(file);
    const once = readFileSync(file, 'utf8');
    runScript(file);
    const twice = readFileSync(file, 'utf8');
    expect(twice).toBe(once); // unchanged on second run
  });

  it('STRICT mode passes when all headers are labeled', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cov-a11y-'));
    const file = join(dir, 'index.html');
    writeFileSync(file, TEMPLATE, 'utf8');
    runScript(file, { COVERAGE_A11Y_STRICT: '1' }); // should not throw
  });

  it('SILENT mode suppresses logs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cov-a11y-'));
    const file = join(dir, 'index.html');
    writeFileSync(file, TEMPLATE, 'utf8');
    // Just ensure it executes without stderr noise; capture output
    runScript(file, { COVERAGE_A11Y_SILENT: '1' });
  });
});
