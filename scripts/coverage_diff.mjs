#!/usr/bin/env node
import fs from 'fs';
import { spawnSync } from 'child_process';

// Configurable thresholds via env (percentages)
const MAX_STATEMENT_DROP = parseFloat(process.env.MAX_STATEMENT_DROP || '0.5');
const MAX_BRANCH_DROP = parseFloat(process.env.MAX_BRANCH_DROP || '1.0');
const MAX_FUNCTION_DROP = parseFloat(process.env.MAX_FUNCTION_DROP || '0.5');
const MAX_LINE_DROP = parseFloat(process.env.MAX_LINE_DROP || '0.5');
// Per-file warning (does not fail) when statement % drops more than this value
const PER_FILE_WARN_DROP = parseFloat(process.env.PER_FILE_WARN_DROP || '2.0');
// Maximum allowed per-file statement drop that will fail build (optional)
const PER_FILE_FAIL_DROP = parseFloat(process.env.PER_FILE_FAIL_DROP || '9999');

function runGit(args) {
  const res = spawnSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout || 'git command failed');
  return res.stdout.trim();
}

function parseSummary(txt) {
  // Expect summary.json style from vitest coverage summary
  try {
    return JSON.parse(txt);
  } catch (e) {
    throw new Error('Failed to parse coverage JSON: ' + e.message);
  }
}

function findSummaryFile(baseDir) {
  const candidates = [
    'coverage/coverage-summary.json',
    'coverage/coverage-summary-v8.json',
    'coverage-summary.json',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('Coverage summary file not found. Run coverage first.');
}

function extractTotals(summary) {
  if (summary.total) return summary.total; // Istanbul format
  return summary; // Fallback
}

function collectFileEntries(summary) {
  const entries = [];
  for (const [file, metrics] of Object.entries(summary)) {
    if (file === 'total') continue;
    if (!metrics.statements) continue;
    entries.push({ file, statements: metrics.statements.pct });
  }
  return entries;
}

function fmt(num) {
  return `${num.toFixed(2)}%`;
}

function main() {
  // Get base branch (default main)
  const baseRef = process.env.GITHUB_BASE_REF || process.env.BASE_REF || 'origin/main';
  if (!/^[A-Za-z0-9._\-\/]+$/.test(baseRef)) {
    throw new Error('Invalid base ref characters');
  }
  // Ensure base coverage file from base ref
  // We checkout only coverage summary file from base for comparison to avoid full workspace mutation.
  const tmpDir = '.tmp_coverage_base';
  fs.mkdirSync(tmpDir, { recursive: true });
  // Use git show to extract file
  const baseFilePath = 'coverage/coverage-summary.json';
  let baseContent;
  try {
    baseContent = runGit(['show', `${baseRef}:${baseFilePath}`]);
  } catch (e) {
    console.warn('Base coverage summary missing on base ref, treating as 0s.');
    baseContent = JSON.stringify({
      total: {
        statements: { pct: 0 },
        branches: { pct: 0 },
        functions: { pct: 0 },
        lines: { pct: 0 },
      },
    });
  }
  fs.writeFileSync(`${tmpDir}/coverage-summary.json`, baseContent);

  const currentSummaryFile = findSummaryFile(process.cwd());
  const currentSummary = parseSummary(fs.readFileSync(currentSummaryFile, 'utf8'));
  const baseSummary = parseSummary(baseContent);

  const curTotals = extractTotals(currentSummary);
  const baseTotals = extractTotals(baseSummary);

  const deltas = {
    statements: curTotals.statements.pct - baseTotals.statements.pct,
    branches: curTotals.branches.pct - baseTotals.branches.pct,
    functions: curTotals.functions.pct - baseTotals.functions.pct,
    lines: curTotals.lines.pct - baseTotals.lines.pct,
  };

  const lines = [];
  lines.push('| Metric | Base | Current | Delta | Limit | Result |');
  lines.push('|--------|------|---------|-------|-------|--------|');

  function assess(key, maxDrop) {
    const drop = -deltas[key];
    const ok = drop <= maxDrop + 1e-9; // tolerate float noise
    const res = ok ? '✅' : '❌';
    lines.push(
      `| ${key} | ${fmt(baseTotals[key].pct)} | ${fmt(curTotals[key].pct)} | ${deltas[key] >= 0 ? '+' : ''}${deltas[key].toFixed(2)} | -${maxDrop}% | ${res} |`,
    );
    return ok;
  }

  const okAll = [
    assess('statements', MAX_STATEMENT_DROP),
    assess('branches', MAX_BRANCH_DROP),
    assess('functions', MAX_FUNCTION_DROP),
    assess('lines', MAX_LINE_DROP),
  ].every(Boolean);

  // Per-file analysis
  let perFileSection = '';
  try {
    const baseEntries = collectFileEntries(baseSummary);
    const curEntries = collectFileEntries(currentSummary);
    const baseMap = Object.fromEntries(baseEntries.map((e) => [e.file, e.statements]));
    const drops = [];
    for (const cur of curEntries) {
      const basePct = baseMap[cur.file];
      if (typeof basePct !== 'number') continue; // new file
      const delta = cur.statements - basePct;
      if (delta < 0) {
        drops.push({ file: cur.file, base: basePct, current: cur.statements, delta });
      }
    }
    drops.sort((a, b) => a.delta - b.delta); // most negative first
    const topDrops = drops.slice(0, 5);
    if (topDrops.length) {
      perFileSection += '\n\n#### Top File Statement Coverage Drops (base vs current)\n\n';
      perFileSection += '| File | Base | Current | Delta | Warn>|\n';
      perFileSection += '|------|------|---------|-------|------|\n';
      for (const d of topDrops) {
        const warn = d.delta <= -PER_FILE_WARN_DROP ? '⚠️' : '';
        perFileSection += `| ${d.file} | ${fmt(d.base)} | ${fmt(d.current)} | ${d.delta.toFixed(2)} | ${warn} |\n`;
      }
    }
    // Evaluate per-file fail condition
    const worstDrop = drops.length ? Math.min(...drops.map((d) => d.delta)) : 0;
    const perFileFail = worstDrop < -PER_FILE_FAIL_DROP;

    const summary = `### Coverage Diff (base: ${baseRef})\n\n` + lines.join('\n') + perFileSection;
    fs.writeFileSync('coverage-diff.md', summary);
    console.log(summary);

    // JSON artifact for tooling
    const jsonOut = {
      baseRef,
      totals: { base: baseTotals, current: curTotals, deltas },
      thresholds: {
        statements: MAX_STATEMENT_DROP,
        branches: MAX_BRANCH_DROP,
        functions: MAX_FUNCTION_DROP,
        lines: MAX_LINE_DROP,
        perFileWarn: PER_FILE_WARN_DROP,
        perFileFail: PER_FILE_FAIL_DROP,
      },
      files: drops, // only negative deltas
      okTotals: okAll,
      worstFileDrop: worstDrop,
    };
    fs.writeFileSync('coverage-diff.json', JSON.stringify(jsonOut, null, 2));

    if (!okAll) {
      console.error('Coverage regression exceeds allowed thresholds.');
      process.exit(2);
    }
    if (worstDrop < -PER_FILE_FAIL_DROP) {
      console.error('Per-file coverage drop exceeds fail threshold.');
      process.exit(3);
    }
  } catch (e) {
    console.warn('Per-file coverage analysis skipped:', e.message);
    const summary = `### Coverage Diff (base: ${baseRef})\n\n` + lines.join('\n');
    fs.writeFileSync('coverage-diff.md', summary);
    if (!okAll) process.exit(2);
  }
}

main();
