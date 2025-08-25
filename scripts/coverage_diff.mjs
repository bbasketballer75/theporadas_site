#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

// Configurable thresholds via env
const MAX_STATEMENT_DROP = parseFloat(process.env.MAX_STATEMENT_DROP || '0.5');
const MAX_BRANCH_DROP = parseFloat(process.env.MAX_BRANCH_DROP || '1.0');
const MAX_FUNCTION_DROP = parseFloat(process.env.MAX_FUNCTION_DROP || '0.5');
const MAX_LINE_DROP = parseFloat(process.env.MAX_LINE_DROP || '0.5');

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
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
  // Fallback: assume the JSON itself is the total metrics
  return summary;
}

function fmt(num) {
  return `${num.toFixed(2)}%`;
}

function main() {
  // Get base branch (default main)
  const baseRef = process.env.GITHUB_BASE_REF || process.env.BASE_REF || 'origin/main';
  // Ensure base coverage file from base ref
  // We checkout only coverage summary file from base for comparison to avoid full workspace mutation.
  const tmpDir = '.tmp_coverage_base';
  fs.mkdirSync(tmpDir, { recursive: true });
  // Use git show to extract file
  const baseFilePath = 'coverage/coverage-summary.json';
  let baseContent;
  try {
    baseContent = run(`git show ${baseRef}:${baseFilePath}`);
  } catch (e) {
    console.warn('Base coverage summary missing on base ref, treating as 0s.');
    baseContent = JSON.stringify({ total: { statements: { pct: 0 }, branches: { pct: 0 }, functions: { pct: 0 }, lines: { pct: 0 } } });
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
    lines.push(`| ${key} | ${fmt(baseTotals[key].pct)} | ${fmt(curTotals[key].pct)} | ${deltas[key] >= 0 ? '+' : ''}${deltas[key].toFixed(2)} | -${maxDrop}% | ${res} |`);
    return ok;
  }

  const okAll = [
    assess('statements', MAX_STATEMENT_DROP),
    assess('branches', MAX_BRANCH_DROP),
    assess('functions', MAX_FUNCTION_DROP),
    assess('lines', MAX_LINE_DROP),
  ].every(Boolean);

  const summary = `Coverage Diff (base: ${baseRef})\n\n` + lines.join('\n');
  fs.writeFileSync('coverage-diff.md', summary);
  console.log(summary);

  if (!okAll) {
    console.error('Coverage regression exceeds allowed thresholds.');
    process.exit(2);
  }
}

main();
