#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function safeReadJSON(p) {
  try {
    if (!existsSync(p)) return undefined;
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('[quality-history] Failed to parse JSON at', p, e.message);
    return undefined;
  }
}

function getGit(ref) {
  try {
    return execSync(ref, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

const commit = process.env.GITHUB_SHA || getGit('git rev-parse HEAD') || 'UNKNOWN';
const commitShort = commit.substring(0, 12);
const branch =
  process.env.GITHUB_REF_NAME ||
  process.env.GITHUB_REF?.replace('refs/heads/', '') ||
  getGit('git rev-parse --abbrev-ref HEAD') ||
  'UNKNOWN';
const ts = new Date().toISOString();

let coverage;
const coverageCandidates = ['coverage/coverage-summary.json', 'coverage/coverage-final.json'];
for (const candidate of coverageCandidates) {
  const data = safeReadJSON(candidate);
  if (data) {
    const total = data.total || data;
    if (total && total.lines && total.statements && total.functions && total.branches) {
      coverage = {
        linesPct: total.lines.pct ?? total.lines.percentage ?? null,
        statementsPct: total.statements.pct ?? total.statements.percentage ?? null,
        functionsPct: total.functions.pct ?? total.functions.percentage ?? null,
        branchesPct: total.branches.pct ?? total.branches.percentage ?? null,
      };
      break;
    }
  }
}

let lighthouse;
const lighthouseCandidates = [
  'lighthouse-report.report.json',
  'artifacts/lighthouse-report.report.json',
];
for (const candidate of lighthouseCandidates) {
  const data = safeReadJSON(candidate);
  if (
    data &&
    data.categories &&
    data.categories.performance &&
    typeof data.categories.performance.score === 'number'
  ) {
    lighthouse = { performance: Math.round(data.categories.performance.score * 100) };
    break;
  }
}

const record = { ts, commit: commitShort, branch, coverage, lighthouse };
mkdirSync('artifacts', { recursive: true });
const historyPath = path.resolve('quality-history.jsonl');
appendFileSync(historyPath, JSON.stringify(record) + '\n', 'utf8');
console.log('[quality-history] Appended record:', record);
#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function safeReadJSON(p) {
  try {
    if (!existsSync(p)) return undefined;
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('[quality-history] Failed to parse JSON at', p, e.message);
    return undefined;
  }
}

function getGit(ref) {
  try {
    return execSync(ref, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

const commit = process.env.GITHUB_SHA || getGit('git rev-parse HEAD') || 'UNKNOWN';
const commitShort = commit.substring(0, 12);
const branch =
  process.env.GITHUB_REF_NAME ||
  process.env.GITHUB_REF?.replace('refs/heads/', '') ||
  getGit('git rev-parse --abbrev-ref HEAD') ||
  'UNKNOWN';
const ts = new Date().toISOString();

let coverage;
const coverageCandidates = ['coverage/coverage-summary.json', 'coverage/coverage-final.json'];
for (const candidate of coverageCandidates) {
  const data = safeReadJSON(candidate);
  if (data) {
    const total = data.total || data;
    if (total && total.lines && total.statements && total.functions && total.branches) {
      coverage = {
        linesPct: total.lines.pct ?? total.lines.percentage ?? null,
        statementsPct: total.statements.pct ?? total.statements.percentage ?? null,
        functionsPct: total.functions.pct ?? total.functions.percentage ?? null,
        branchesPct: total.branches.pct ?? total.branches.percentage ?? null,
      };
      break;
    }
  }
}

let lighthouse;
const lighthouseCandidates = [
  'lighthouse-report.report.json',
  'artifacts/lighthouse-report.report.json',
];
for (const candidate of lighthouseCandidates) {
  const data = safeReadJSON(candidate);
  if (
    data &&
    data.categories &&
    data.categories.performance &&
    typeof data.categories.performance.score === 'number'
  ) {
    lighthouse = { performance: Math.round(data.categories.performance.score * 100) };
    break;
  }
}

const record = { ts, commit: commitShort, branch, coverage, lighthouse };
mkdirSync('artifacts', { recursive: true });
const historyPath = path.resolve('quality-history.jsonl');
appendFileSync(historyPath, JSON.stringify(record) + '\n', 'utf8');
console.log('[quality-history] Appended record:', record);
