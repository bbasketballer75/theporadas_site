#!/usr/bin/env node
/**
 * codeql_trend_append.mjs
 * Appends a dated delta block to SECURITY_NOTES.md comparing current alert counts to immutable baseline.
 *
 * Data sources:
 *  - Immutable baseline section in SECURITY_NOTES.md (first automated run) for initial counts
 *  - Current alerts via GitHub API (gh code scanning alerts) or existing codeql_alerts.json
 *
 * Usage:
 *   node scripts/codeql_trend_append.mjs --alerts codeql_alerts.json [--write]
 *   If --write omitted, prints would-be block.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { safeFetchJson } from './lib/safe_fetch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { alerts: 'codeql_alerts.json', write: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--alerts') opts.alerts = args[++i];
    else if (a === '--write') opts.write = true;
    else if (a === '--help') {
      console.log(
        'Usage: node scripts/codeql_trend_append.mjs --alerts codeql_alerts.json [--write]',
      );
      process.exit(0);
    } else {
      console.error('Unknown arg', a);
      process.exit(1);
    }
  }
  return opts;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function fetchAlertsViaGhCli(repo) {
  try {
    const res = spawnSync(
      process.platform === 'win32' ? 'gh.exe' : 'gh',
      ['api', '-H', 'Accept: application/vnd.github+json', `/repos/${repo}/code-scanning/alerts?per_page=100`],
      { encoding: 'utf8' },
    );
    if (res.status === 0) {
      return JSON.parse(res.stdout);
    }
  } catch (_) {
    // ignore
  }
  return null;
}

async function fetchAlertsViaApi(repo, token) {
  if (!token) return null;
  const url = `https://api.github.com/repos/${repo}/code-scanning/alerts?per_page=100`;
  try {
    return await safeFetchJson(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'codeql-trend-append',
      },
      maxBytes: 2_000_000,
    });
  } catch (_) {
    return null;
  }
}

async function loadAlerts(alertsPath, repo) {
  if (fs.existsSync(alertsPath)) return readJSON(alertsPath);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const viaApi = await fetchAlertsViaApi(repo, token);
  if (viaApi) return viaApi;
  const viaCli = fetchAlertsViaGhCli(repo);
  if (viaCli) return viaCli;
  throw new Error('No alerts JSON available');
}

function extractBaseline(text) {
  // Strategy:
  // 1. Locate the immutable verification section starting with heading:
  //    ## CodeQL Baseline Verification (First Automated Run YYYY-MM-DD)
  // 2. Inside that section counts are expressed as bullet lines:
  //    - Alerts (Total): N
  //    - Critical: C
  //    - High: H
  //    - Medium: M
  //    - Low: L
  // We build a low bucket matching previous trend logic (Low/Note) by
  // combining Medium + Low (critical + high remain separate; medium not previously exposed).
  // If the immutable section is absent (feature not yet enabled) we return null to signal skip.
  const headingRe = /^## CodeQL Baseline Verification \(First Automated Run .*?\)$/m;
  const headingMatch = text.match(headingRe);
  if (!headingMatch) return null; // Do not proceed if only 'Pending Enablement' present
  // Extract subsection starting at heading until next level-2 heading or EOF.
  const startIdx = headingMatch.index;
  const rest = text.slice(startIdx);
  const nextHeadingIdx = rest.slice(1).search(/^## /m); // search after first char to avoid matching same heading
  const section = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx + 1);
  const lines = section.split(/\r?\n/);
  const counts = {};
  for (const line of lines) {
    const m = line.match(/^-\s+([A-Za-z/() ]+):\s+(\d+)/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = +m[2];
      if (key.includes('total')) counts.total = val;
      else if (key.startsWith('critical')) counts.critical = val;
      else if (key.startsWith('high')) counts.high = val;
      else if (key.startsWith('medium')) counts.medium = val;
      else if (key.startsWith('low')) counts.lowLow = val; // avoid name clash
    }
  }
  if (!('total' in counts) || !('high' in counts)) return null;
  const total = counts.total ?? 0;
  const high = counts.high ?? 0;
  // Combine medium + low bullets to emulate previous low bucket (excluding high/critical)
  const medium = counts.medium ?? 0;
  const lowLow = counts.lowLow ?? 0;
  const lowBucket = medium + lowLow + (counts.critical ?? 0); // Prior logic did not separate critical; include if present so total math stays consistent
  return { total, high, low: lowBucket };
}

function currentCounts(alerts) {
  let high = 0;
  let low = 0; // treat warning+note as low bucket for trend simplicity
  for (const a of alerts) {
    const sev = a.security_severity_level || a.rule?.security_severity_level;
    if (sev === 'critical' || sev === 'high' || a.rule?.severity === 'error') high++;
    else low++;
  }
  return { total: alerts.length, high, low };
}

function formatDeltaLine(label, baseline, current) {
  const delta = current - baseline;
  const sign = delta === 0 ? '' : delta > 0 ? '+' : '';
  return `| ${label} | ${baseline} | ${current} | ${sign}${delta} |`;
}

function buildBlock(dateISO, baseline, current) {
  return [
    `### CodeQL Trend Delta (${dateISO})`,
    '',
    '| Metric | Baseline | Current | Delta |',
    '|--------|----------|---------|-------|',
    formatDeltaLine('Total Alerts', baseline.total, current.total),
    formatDeltaLine('High Alerts', baseline.high, current.high),
    formatDeltaLine('Low/Note Alerts', baseline.low, current.low),
    '',
    '_Delta: positive = increase vs immutable baseline; negative = reduction._',
    '',
  ].join('\n');
}

function alreadyHasBlock(text, dateISO) {
  return text.includes(`CodeQL Trend Delta (${dateISO})`);
}

function appendBlock(filePath, block) {
  const text = fs.readFileSync(filePath, 'utf8');
  const updated = text.trimEnd() + '\n\n' + block + '\n';
  fs.writeFileSync(filePath, updated);
}

(async function main() {
  const opts = parseArgs();
  const repo = process.env.GITHUB_REPOSITORY;
  const alerts = await loadAlerts(opts.alerts, repo);
  const securityNotesPath = path.join(__dirname, '..', 'SECURITY_NOTES.md');
  const notes = fs.readFileSync(securityNotesPath, 'utf8');
  const baseline = extractBaseline(notes);
  if (!baseline) {
    console.log('Baseline verification section not present; skipping trend append.');
    return;
  }
  const current = currentCounts(alerts);
  const today = new Date().toISOString().slice(0, 10);
  const block = buildBlock(today, baseline, current);
  if (alreadyHasBlock(notes, today)) {
    console.log('Trend block for today already present; skipping');
    return;
  }
  if (opts.write) {
    appendBlock(securityNotesPath, block);
    console.log('Appended trend block');
  } else {
    console.log(block);
  }
})();
