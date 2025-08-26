#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Reads Lighthouse CI assertion results (stdout JSON via lhci autorun) is not trivially accessible.
 * Instead, we assume lhci has produced a manifest (e.g., .lighthouseci/(
 * We will collect the latest lhr*.json files and extract relevant categories + audits
 */

import { readdir, readFile } from 'node:fs/promises';

const ROOT = resolve(process.cwd());
const LHCI_DIR = resolve(ROOT, '.lighthouseci');
const OUT_DIR = resolve(ROOT, 'artifacts');
const SNAPSHOT_FILE = resolve(OUT_DIR, 'lighthouse-assertions.json');
const SCHEMA_VERSION = 2; // increment when snapshot data shape changes

async function collectLighthouseReports() {
  if (!existsSync(LHCI_DIR)) {
    console.error('[lhci_snapshot] No .lighthouseci directory found. Run lhci first.');
    process.exitCode = 1;
    return [];
  }
  const entries = await readdir(LHCI_DIR);
  const reportFiles = entries.filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
  const reports = [];
  for (const file of reportFiles) {
    try {
      const json = JSON.parse(await readFile(resolve(LHCI_DIR, file), 'utf8'));
      reports.push(json);
    } catch (e) {
      console.warn('[lhci_snapshot] Failed to parse', file, e.message);
    }
  }
  return reports;
}

function extractAssertionData(reports) {
  // Collapse to max scores per category & list non-perfect audits; collect key metrics from first report (representative)
  if (!reports.length)
    return {
      schemaVersion: SCHEMA_VERSION,
      categories: {},
      audits: {},
      metrics: {},
      meta: { reports: 0 },
    };
  const categories = {};
  const audits = {};
  for (const r of reports) {
    if (r.categories) {
      for (const [key, cat] of Object.entries(r.categories)) {
        const score = typeof cat.score === 'number' ? cat.score : null;
        if (score != null) {
          if (!categories[key] || categories[key] < score) categories[key] = score;
        }
      }
    }
    if (r.audits) {
      for (const [aid, audit] of Object.entries(r.audits)) {
        if (audit.score !== 1) {
          audits[aid] = {
            title: audit.title,
            score: audit.score,
            scoreDisplayMode: audit.scoreDisplayMode,
            numericValue: audit.numericValue,
            displayValue: audit.displayValue,
          };
        }
      }
    }
  }
  // metrics (from first report only to avoid mixing strategies / pages)
  const primary = reports[0];
  const metrics = {};
  const metricMap = {
    LCP: 'largest-contentful-paint',
    FCP: 'first-contentful-paint',
    CLS: 'cumulative-layout-shift',
    TBT: 'total-blocking-time',
    SI: 'speed-index',
  };
  for (const [abbr, auditId] of Object.entries(metricMap)) {
    const a = primary?.audits?.[auditId];
    if (a && typeof a.numericValue === 'number') {
      metrics[abbr] = { numericValue: a.numericValue, score: a.score };
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    categories,
    audits,
    metrics,
    meta: { reports: reports.length, generatedAt: new Date().toISOString() },
  };
}

async function main() {
  const reports = await collectLighthouseReports();
  const data = extractAssertionData(reports);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await writeFile(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
  console.log('[lhci_snapshot] Wrote snapshot', SNAPSHOT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
