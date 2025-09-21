#!/usr/bin/env node
// Lightweight diff utilities for Lighthouse category, audit, and metrics comparisons.
// Imported by test suite (test/lhci_diff.test.ts) and can also be run directly.
import { existsSync, readFileSync } from 'node:fs';

export function diffCategories(prev = {}, curr = {}) {
  const categories = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
  const rows = [];
  for (const cat of categories) {
    const p = prev[cat];
    const c = curr[cat];
    if (typeof p === 'number' && typeof c === 'number') {
      if (p !== c)
        rows.push({ category: cat, previous: p, current: c, delta: +(c - p).toFixed(4) });
    } else if (p == null && typeof c === 'number') {
      rows.push({ category: cat, previous: null, current: c, delta: null });
    } else if (c == null && typeof p === 'number') {
      rows.push({ category: cat, previous: p, current: null, delta: null });
    }
  }
  return rows.sort((a, b) => a.category.localeCompare(b.category));
}

export function diffAudits(prev = {}, curr = {}) {
  const added = [];
  const removed = [];
  const changed = [];
  const all = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const id of all) {
    const p = prev[id];
    const c = curr[id];
    if (p && !c) removed.push({ id, previous: p });
    else if (!p && c) added.push({ id, current: c });
    else if (p && c) {
      const scoreChanged = p.score !== c.score;
      const numChanged = p.numericValue !== c.numericValue;
      if (scoreChanged || numChanged) {
        changed.push({ id, previous: p, current: c });
      }
    }
  }
  return {
    added: added.sort((a, b) => a.id.localeCompare(b.id)),
    removed: removed.sort((a, b) => a.id.localeCompare(b.id)),
    changed: changed.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function normalizeMetricEntry(entry) {
  if (!entry) return { numericValue: null, score: null };
  return {
    numericValue: typeof entry.numericValue === 'number' ? entry.numericValue : null,
    score: typeof entry.score === 'number' ? entry.score : null,
  };
}

export function diffMetrics(prev = {}, curr = {}) {
  const rows = [];
  function pushAdded(m, cNorm) {
    rows.push({
      metric: m,
      previous: null,
      current: cNorm.numericValue ?? cNorm.score,
      delta: null,
      scoreDelta: null,
    });
  }
  function pushRemoved(m, pNorm) {
    rows.push({
      metric: m,
      previous: pNorm.numericValue ?? pNorm.score,
      current: null,
      delta: null,
      scoreDelta: null,
    });
  }
  function pushChanged(m, pNorm, cNorm) {
    const prevNum = pNorm.numericValue ?? pNorm.score;
    const currNum = cNorm.numericValue ?? cNorm.score;
    const delta = prevNum != null && currNum != null ? currNum - prevNum : null;
    const scoreDelta =
      pNorm.score !== null && cNorm.score !== null ? +(cNorm.score - pNorm.score).toFixed(4) : null;
    if (delta || scoreDelta) {
      rows.push({
        metric: m,
        previous: prevNum,
        current: currNum,
        delta,
        scoreDelta,
      });
    }
  }
  for (const m of new Set([...Object.keys(prev), ...Object.keys(curr)])) {
    const p = prev[m];
    const c = curr[m];
    if (!p && c) {
      pushAdded(m, normalizeMetricEntry(c));
      continue;
    }
    if (p && !c) {
      pushRemoved(m, normalizeMetricEntry(p));
      continue;
    }
    if (p && c) pushChanged(m, normalizeMetricEntry(p), normalizeMetricEntry(c));
  }
  return rows.sort((a, b) => a.metric.localeCompare(b.metric));
}

function pushTable(lines, title, headers, rows) {
  if (!rows.length) return;
  lines.push(`\n### ${title}`);
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const r of rows) lines.push(`| ${r.join(' | ')} |`);
}

export function toMarkdown({
  catDiff = [],
  auditDiff = { added: [], removed: [], changed: [] },
  metricsDiff = [],
  prev = {},
  curr = {},
}) {
  const lines = [];
  if (prev.schemaVersion !== curr.schemaVersion) {
    lines.push(
      `## Schema changed: ${prev.schemaVersion || 'none'} -> ${curr.schemaVersion || 'none'}`,
    );
  }
  if (catDiff.length) {
    pushTable(
      lines,
      'Category Score Changes',
      ['Category', 'Previous', 'Current', 'Delta'],
      catDiff.map((r) => [r.category, r.previous ?? '', r.current ?? '', r.delta ?? '']),
    );
  }
  if (metricsDiff.length) {
    pushTable(
      lines,
      'Key Metrics',
      ['Metric', 'Previous', 'Current', 'Delta', 'Score Δ'],
      metricsDiff.map((m) => [
        m.metric,
        m.previous ?? '',
        m.current ?? '',
        m.delta ?? '',
        m.scoreDelta ?? '',
      ]),
    );
  }
  const { added, removed, changed } = auditDiff;
  if (!(added.length || removed.length || changed.length)) return lines.join('\n');
  lines.push('\n### Audit Changes');
  function wrap(label, list) {
    if (!list.length) return;
    lines.push(`\n<details><summary>${label}</summary>`);
    for (const item of list) lines.push(`- ${item.id}`);
    lines.push('</details>');
  }
  wrap('Added', added);
  wrap('Removed', removed);
  wrap('Changed', changed);
  return lines.join('\n');
}

// CLI usage: node scripts/lhci_diff.mjs <prev.json> <curr.json>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , prevPath, currPath] = process.argv;
  if (!prevPath || !currPath) {
    console.error('Usage: node scripts/lhci_diff.mjs <prev.json> <curr.json>');
    process.exit(1);
  }
  if (!existsSync(prevPath) || !existsSync(currPath)) {
    console.error('One or both files not found');
    process.exit(1);
  }
  const prevData = JSON.parse(readFileSync(prevPath, 'utf8'));
  const currData = JSON.parse(readFileSync(currPath, 'utf8'));
  const catDiff = diffCategories(
    prevData.categories
      ? Object.fromEntries(Object.entries(prevData.categories).map(([k, v]) => [k, v.score]))
      : {},
    currData.categories
      ? Object.fromEntries(Object.entries(currData.categories).map(([k, v]) => [k, v.score]))
      : {},
  );
  const auditDiff = diffAudits(prevData.audits || {}, currData.audits || {});
  const metricsDiff = diffMetrics(prevData.categoryGroups || {}, currData.categoryGroups || {});
  console.log(toMarkdown({ catDiff, auditDiff, metricsDiff, prev: prevData, curr: currData }));
}
