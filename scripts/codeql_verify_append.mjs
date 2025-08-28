#!/usr/bin/env node
/*
 Fetch CodeQL alerts and append a verification section to SECURITY_NOTES.md
 if (and only if) Code Scanning is enabled and a prior pending verification
 section exists without any finalized verification section.

 Idempotency rules:
 - Do nothing (exit 0) if SECURITY_NOTES.md already contains a heading
   starting with '## CodeQL Baseline Verification (First Automated Run'.
 - If alerts API returns 404 or 403 (feature disabled), exit 0 silently.
 - On success, compute severity counts, append a new section after the
   pending verification section delimiter line, without modifying older
   baseline sections.

 Environment requirements:
 - GITHUB_REPOSITORY (owner/repo)
 - GITHUB_TOKEN (or GITHUB_APP_INSTALLATION_TOKEN)

 Outputs (artifacts directory):
 - artifacts/codeql-verification-alerts.json
 - artifacts/codeql-verification-counts.json
 - artifacts/codeql-verification-section.md
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
if (/^## CodeQL Baseline Verification \(First Automated Run/m.test(notes)) {
  console.log('Verification section already present; nothing to do.');
  process.exit(0);
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
          'User-Agent': 'codeql-verify-append-script',
        },
        maxBytes: 2_000_000,
      });
    } catch (e) {
      if (/Fetch failed 40[34]/.test(e.message)) {
        console.log(`Code scanning not enabled yet (${e.message}); skipping append.`);
        return null;
      }
      console.error('Failed fetching alerts', e.message);
      process.exit(2);
    }
    if (!Array.isArray(data)) {
      console.error('Unexpected response (not array)');
      process.exit(3);
    }
    alerts.push(...data);
    if (data.length < perPage) break;
    page++;
    if (page > 1000) {
      console.error('Aborting: excessive pages (>1000)');
      process.exit(4);
    }
  }
  return alerts;
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
function buildSection(counts) {
  const date = new Date().toISOString().slice(0, 10);
  return `## CodeQL Baseline Verification (First Automated Run ${date})\n\nVerified CodeQL alert ingestion after enabling Code Scanning. Severity counts (security-and-quality query pack):\n\n- Alerts (Total): ${counts.total}\n- Critical: ${counts.critical}\n- High: ${counts.high}\n- Medium: ${counts.medium}\n- Low: ${counts.low}\n\nTriage: High/Medium alerts must have issues opened within 24h (link issues here if any). Accepted Low findings require documented rationale referencing commit hashes.\n\nThis section is immutable; subsequent drift will be tracked in future monthly delta summaries rather than altering baseline figures.\n`;
}

(async () => {
  const alerts = await fetchAlerts();
  if (alerts === null) {
    process.exit(0); // feature not enabled yet
  }
  const counts = aggregate(alerts);
  const section = buildSection(counts);
  // Write artifacts
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-verification-alerts.json'),
    JSON.stringify(alerts, null, 2),
  );
  fs.writeFileSync(
    path.join(artifactsDir, 'codeql-verification-counts.json'),
    JSON.stringify(counts, null, 2),
  );
  fs.writeFileSync(path.join(artifactsDir, 'codeql-verification-section.md'), section);

  // Append to SECURITY_NOTES.md after the pending verification section if present, else at end
  let updated = notes;
  if (/^## CodeQL Baseline Verification \(Pending Enablement\)/m.test(notes)) {
    const lines = notes.split(/\r?\n/);
    // find end of pending section (blank line after its block of dashes line or next heading) - simplistic: append at end
    updated = notes.trimEnd() + '\n\n' + section + '\n';
  } else {
    updated = notes.trimEnd() + '\n\n' + section + '\n';
  }
  fs.writeFileSync(notesPath, updated);
  console.log('Appended verification section.');
})();
