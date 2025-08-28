#!/usr/bin/env node
/*
 Compute drift (delta) in CodeQL alert severities relative to the immutable
 baseline verification section appended by scripts/codeql_verify_append.mjs.

 Outputs (artifacts directory):
 - artifacts/codeql-drift-current-alerts.json
 - artifacts/codeql-drift-current-counts.json
 - artifacts/codeql-drift-delta.json (positive/negative changes)
 - artifacts/codeql-drift-report.md (markdown summary snippet)

 Behavior:
 - Parses SECURITY_NOTES.md to locate the baseline verification heading that starts
   with '## CodeQL Baseline Verification (First Automated Run ' and extract the
   baseline counts (Critical/High/Medium/Low and Total).
 - Fetches current alerts via GitHub REST API (requires GITHUB_REPOSITORY and a token
   in GITHUB_TOKEN or GITHUB_APP_INSTALLATION_TOKEN with code scanning alerts:read).
 - Computes deltas (current - baseline) per severity plus total.
 - Writes artifacts and prints a concise JSON summary to stdout (unless QUIET=1).
 - If baseline section missing, exits 0 with a warning (treat as no-op) unless
   STRICT=1 in env, in which case exits 2.
 - If Code Scanning not yet enabled (403/404), exits 0 (no drift yet) writing
   an informational markdown snippet noting unavailability.

 Edge Cases Handled:
 - Missing SECURITY_NOTES.md
 - Malformed baseline section (regex failure)
 - No alerts (current counts all zero)
 - Extra severities returned (ignored unless mapped)

 Mapping aligns with existing scripts for consistency.
*/
import fs from 'fs';
import path from 'path';
import process from 'process';
import { safeFetchJson } from './lib/safe_fetch.mjs';

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY not set');
  process.exit(1);
}
const token = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_INSTALLATION_TOKEN;
if (!token) {
  console.error('No token provided in GITHUB_TOKEN or GITHUB_APP_INSTALLATION_TOKEN');
  process.exit(1);
}

const notesPath = path.join(process.cwd(), 'SECURITY_NOTES.md');
if (!fs.existsSync(notesPath)) {
  console.error('SECURITY_NOTES.md not found');
  process.exit(1);
}
const notes = fs.readFileSync(notesPath, 'utf8');

function parseBaselineCounts(markdown) {
  // Find the baseline verification section and extract list items with counts.
  const headingRegex = /^## CodeQL Baseline Verification \(First Automated Run .*\)$/m;
  const headingMatch = markdown.match(headingRegex);
  if (!headingMatch) return null;
  // Slice from heading to next heading or end.
  const startIdx = headingMatch.index;
  const rest = markdown.slice(startIdx);
  const nextHeadingIdx = rest.slice(1).search(/\n## /); // search after first char to avoid matching same line
  const section = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx + 1);
  // Extract list bullet counts: we expect lines like '- Alerts (Total): 12'
  const counts = { total: null, critical: null, high: null, medium: null, low: null };
  const lineRegex = /^- (Alerts \(Total\)|Critical|High|Medium|Low):\s+(\d+)/gm;
  let m;
  while ((m = lineRegex.exec(section)) !== null) {
    const keyRaw = m[1];
    const value = Number(m[2]);
    switch (keyRaw.toLowerCase()) {
      case 'alerts (total)':
        counts.total = value;
        break;
      case 'critical':
        counts.critical = value;
        break;
      case 'high':
        counts.high = value;
        break;
      case 'medium':
        counts.medium = value;
        break;
      case 'low':
        counts.low = value;
        break;
      default:
        break;
    }
  }
  if (Object.values(counts).some((v) => v === null)) {
    return null; // malformed
  }
  return counts;
}

const baseline = parseBaselineCounts(notes);
if (!baseline) {
  const msg = 'Baseline verification section not found or malformed; skipping drift computation.';
  if (process.env.STRICT === '1') {
    console.error(msg);
    process.exit(2);
  } else {
    console.warn(msg);
    process.exit(0);
  }
}

async function fetchAlerts() {
  const alerts = [];
  const base = `https://api.github.com/repos/${repo}/code-scanning/alerts`;
  let page = 1;
  const perPage = 100;
  while (true) {
    const url = `${base}?page=${page}&per_page=${perPage}`;
    let data;
    try {
      data = await safeFetchJson(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'codeql-drift-delta-script',
        },
        maxBytes: 2_000_000,
      });
    } catch (e) {
      if (/Fetch failed 40[34]/.test(e.message)) {
        const code = Number(e.message.match(/40([34])/)?.[0]) || 403;
        return { alerts: null, status: code };
      }
      console.error('Failed fetching alerts', e.message);
      process.exit(3);
    }
    if (!Array.isArray(data)) {
      console.error('Unexpected response (not array)');
      process.exit(4);
    }
    alerts.push(...data);
    if (data.length < perPage) break;
    page++;
    if (page > 1000) {
      console.error('Aborting: excessive pages (>1000)');
      process.exit(5);
    }
  }
  return { alerts, status: 200 };
}

function normalizeSeverity(alert) {
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
    const sev = normalizeSeverity(a);
    counts[sev] ??= 0;
    counts[sev]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, ...counts };
}

function computeDelta(current, base) {
  return {
    total: current.total - base.total,
    critical: current.critical - base.critical,
    high: current.high - base.high,
    medium: current.medium - base.medium,
    low: current.low - base.low,
  };
}

function buildReport(baselineCounts, currentCounts, delta, unavailable) {
  const date = new Date().toISOString().slice(0, 10);
  if (unavailable) {
    return `## CodeQL Drift Report (${date})\n\nCode Scanning not currently enabled (HTTP ${unavailable}); drift cannot be computed. Baseline remains unchanged.\n`;
  }
  const formatDelta = (v) => (v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`);
  return `## CodeQL Drift Report (${date})\n\nDelta since First Automated Run baseline (current - baseline):\n\n| Severity | Baseline | Current | Delta |\n|----------|----------|---------|-------|\n| Total | ${baselineCounts.total} | ${currentCounts.total} | ${formatDelta(delta.total)} |\n| Critical | ${baselineCounts.critical} | ${currentCounts.critical} | ${formatDelta(delta.critical)} |\n| High | ${baselineCounts.high} | ${currentCounts.high} | ${formatDelta(delta.high)} |\n| Medium | ${baselineCounts.medium} | ${currentCounts.medium} | ${formatDelta(delta.medium)} |\n| Low | ${baselineCounts.low} | ${currentCounts.low} | ${formatDelta(delta.low)} |\n\nInterpretation: Positive delta indicates new or unresolved alerts added since baseline; negative delta indicates net reduction (fixed / dismissed). Track High/Medium increases promptly.\n`;
}

(async () => {
  const { alerts, status } = await fetchAlerts();
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
  if (alerts === null) {
    const report = buildReport(baseline, null, null, status);
    fs.writeFileSync(path.join(artifactsDir, 'codeql-drift-report.md'), report);
    if (!process.env.QUIET) console.log(JSON.stringify({ unavailable: status }, null, 2));
    process.exit(0);
  }
  const currentCounts = aggregate(alerts);
  const delta = computeDelta(currentCounts, baseline);
  const report = buildReport(baseline, currentCounts, delta, null);
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-drift-current-alerts.json'),
    JSON.stringify(alerts, null, 2),
  );
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-drift-current-counts.json'),
    JSON.stringify(currentCounts, null, 2),
  );
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-drift-delta.json'),
    JSON.stringify(delta, null, 2),
  );
  fs.writeFileSync(path.join(artifactsDir, 'codeql-drift-report.md'), report);
  if (!process.env.QUIET) console.log(JSON.stringify({ baseline, currentCounts, delta }, null, 2));
})();
