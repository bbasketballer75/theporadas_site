#!/usr/bin/env node
/*
 Fetch CodeQL alerts via GitHub REST API using GITHUB_TOKEN (or App env vars if present),
 aggregate severity counts, output:
 1. JSON to stdout (unless QUIET=1)
 2. Write artifacts/codeql-alerts.json
 3. Write artifacts/codeql-baseline-snippet.md (markdown snippet replacing placeholder)
 Does NOT modify SECURITY_NOTES.md directly (that is done by finalize workflow)
*/
import fs from 'fs';
import path from 'path';
import process from 'process';
import { safeFetchJson } from './lib/safe_fetch.mjs';

const repo = process.env.GITHUB_REPOSITORY; // owner/repo
if (!repo) {
  console.error('GITHUB_REPOSITORY not set');
  process.exit(1);
}

// Accept a token via standard envs (prioritized): GITHUB_TOKEN, GITHUB_APP_INSTALLATION_TOKEN
const token = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_INSTALLATION_TOKEN;
if (!token) {
  console.error('No token provided in GITHUB_TOKEN or GITHUB_APP_INSTALLATION_TOKEN');
  process.exit(1);
}

async function fetchAllAlerts() {
  const base = `https://api.github.com/repos/${repo}/code-scanning/alerts`;
  let page = 1;
  const perPage = 100;
  const all = [];
  while (true) {
    const url = `${base}?page=${page}&per_page=${perPage}`;
    let data;
    try {
      data = await safeFetchJson(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'codeql-baseline-snapshot-script',
        },
        maxBytes: 2_000_000,
      });
    } catch (e) {
      console.error('Error fetching alerts page', page, e.message);
      process.exit(3);
    }
    if (!Array.isArray(data)) {
      console.error('Unexpected response (not array)', data);
      process.exit(4);
    }
    all.push(...data);
    if (data.length < perPage) break;
    page++;
    if (page > 10_000) {
      console.error('Aborting: too many pages (>10k)');
      process.exit(5);
    }
  }
  return all;
}

function normalizeSeverity(alert) {
  // CodeQL REST alert has .rule.severity (one of: critical, high, medium, low, warning, note?)
  const sev = alert?.rule?.severity || alert?.rule?.security_severity_level || 'unknown';
  const map = {
    critical: 'critical',
    high: 'high',
    error: 'high',
    medium: 'medium',
    warning: 'low',
    low: 'low',
    note: 'low',
    unknown: 'low',
  };
  return map[sev] || sev || 'low';
}

function aggregate(alerts) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alerts) {
    counts[normalizeSeverity(a)] ??= 0; // ensure key exists
    counts[normalizeSeverity(a)]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, ...counts };
}

function generateSnippet(counts, runNumberEnv) {
  const date = new Date().toISOString().slice(0, 10);
  const runNumber = runNumberEnv || process.env.CODEQL_RUN_NUMBER || 'unknown';
  const gatingRemovalCommit = process.env.CODEQL_GATING_REMOVAL_SHA || '<commit-sha>'; // can be set in workflow
  return `## CodeQL Baseline (${date})\n\nEstablished from successful run (run_number: ${runNumber}).\n\nSeverity Counts (security-and-quality query pack):\n\n- Alerts (Total): ${counts.total}\n- Critical: ${counts.critical}\n- High: ${counts.high}\n- Medium: ${counts.medium}\n- Low: ${counts.low}\n\nGating Removal: Completed earlier in commit ${gatingRemovalCommit}. Future changes should reference this immutable baseline.\n\nProcess: This snapshot captured via automated script (scripts/codeql_baseline_snapshot.mjs) using GitHub REST API. Replace prior placeholder section only; retain historical narrative below.\n`;
}

(async () => {
  const alerts = await fetchAllAlerts();
  const counts = aggregate(alerts);
  if (!process.env.QUIET) {
    console.log(JSON.stringify({ counts, sample: alerts.slice(0, 2) }, null, 2));
  }
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, 'codeql-alerts.json'), JSON.stringify(alerts, null, 2));
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-alert-counts.json'),
    JSON.stringify(counts, null, 2),
  );
  fs.writeFileSync(path.join(artifactsDir, 'codeql-baseline-snippet.md'), generateSnippet(counts));
})();
