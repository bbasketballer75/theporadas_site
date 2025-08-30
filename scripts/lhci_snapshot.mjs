#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Reads Lighthouse CI assertion results (stdout JSON via lhci autorun) is not trivially accessible.
 * Instead, we assume lhci has produced a manifest (e.g., .lighthouseci/(
 * We will collect the latest lhr*.json files and extract relevant categories + audits
 */

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
  if (!reports.length) {
    return createEmptyAssertionData();
  }

  const categories = processCategories(reports);
  const audits = processAudits(reports);
  const metrics = extractMetrics(reports[0]);

  return createAssertionData(categories, audits, metrics, reports.length);
}

function createEmptyAssertionData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: {},
    audits: {},
    metrics: {},
    meta: { reports: 0 },
  };
}

function createAssertionData(categories, audits, metrics, reportCount) {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories,
    audits,
    metrics,
    meta: { reports: reportCount, generatedAt: new Date().toISOString() },
  };
}

function processCategories(reports) {
  const categories = {};
  for (const r of reports) {
    if (r.categories) {
      for (const [key, cat] of Object.entries(r.categories)) {
        updateCategoryScore(categories, key, cat.score);
      }
    }
  }
  return categories;
}

function updateCategoryScore(categories, key, score) {
  const validScore = typeof score === 'number' ? score : null;
  if (validScore != null) {
    if (!categories[key] || categories[key] < validScore) {
      categories[key] = validScore;
    }
  }
}

function processAudits(reports) {
  const audits = {};
  for (const r of reports) {
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
  return audits;
}

function extractMetrics(primaryReport) {
  const metrics = {};
  const metricMap = {
    LCP: 'largest-contentful-paint',
    FCP: 'first-contentful-paint',
    CLS: 'cumulative-layout-shift',
    TBT: 'total-blocking-time',
    SI: 'speed-index',
  };

  for (const [abbr, auditId] of Object.entries(metricMap)) {
    const audit = primaryReport?.audits?.[auditId];
    if (audit && typeof audit.numericValue === 'number') {
      metrics[abbr] = { numericValue: audit.numericValue, score: audit.score };
    }
  }
  return metrics;
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
