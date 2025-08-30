#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();

function loadJSON(path) {
  if (!existsSync(path)) return null;
  return readFile(path, 'utf8').then((c) => JSON.parse(c));
}

export function diffCategories(prev = {}, curr = {}) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const rows = [];
  for (const k of keys) {
    const a = prev[k];
    const b = curr[k];
    if (a === b) continue;
    rows.push({
      category: k,
      previous: a,
      current: b,
      delta: b != null && a != null ? +(b - a).toFixed(3) : null,
    });
  }
  return rows;
}

export function auditKey(audit) {
  return audit;
}

export function diffAudits(prev = {}, curr = {}) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const added = [];
  const removed = [];
  const changed = [];
  for (const k of keys) {
    const a = prev[k];
    const b = curr[k];
    if (a && !b) removed.push({ id: k, previous: a });
    else if (!a && b) added.push({ id: k, current: b });
    else if (a && b) {
      if (a.score !== b.score || a.numericValue !== b.numericValue) {
        changed.push({ id: k, previous: a, current: b });
      }
    }
  }
  return { added, removed, changed };
}

export function diffMetrics(prev = {}, curr = {}) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const rows = [];
  for (const k of keys) {
    const a = prev[k];
    const b = curr[k];
    if (!a && b) {
      rows.push({
        metric: k,
        previous: null,
        current: b.numericValue,
        delta: null,
        scoreDelta: null,
      });
    } else if (a && !b) {
      rows.push({
        metric: k,
        previous: a.numericValue,
        current: null,
        delta: null,
        scoreDelta: null,
      });
    } else if (a && b) {
      const delta =
        b.numericValue != null && a.numericValue != null
          ? +(b.numericValue - a.numericValue).toFixed(1)
          : null;
      const scoreDelta =
        b.score != null && a.score != null ? +(b.score - a.score).toFixed(3) : null;
      if (delta !== 0 || scoreDelta !== 0) {
        rows.push({
          metric: k,
          previous: a.numericValue,
          current: b.numericValue,
          delta,
          scoreDelta,
        });
      }
    }
  }
  return rows;
}

function emojiForDelta(delta, invert = false) {
  if (delta == null) return '';
  const good = invert ? delta > 0 : delta < 0; // for timing metrics lower is better
  if (delta === 0) return '';
  return good ? '✅' : '⚠️';
}

export function toMarkdown({ catDiff, auditDiff, metricsDiff, prev, curr }) {
  const lines = [];
  lines.push('### Lighthouse Assertions Diff');
  // schema version note
  const prevSchema = prev?.schemaVersion || 1;
  const currSchema = curr?.schemaVersion || 1;
  if (prevSchema !== currSchema) {
    lines.push(
      `\n> Schema changed (prev v${prevSchema} -> curr v${currSchema}); some comparisons may be partial.`,
    );
  }
  if (
    !catDiff.length &&
    !auditDiff.added.length &&
    !auditDiff.removed.length &&
    !auditDiff.changed.length &&
    !metricsDiff.length
  ) {
    lines.push('No differences detected.');
    return lines.join('\n');
  }
  if (catDiff.length) {
    lines.push('\n<details><summary><strong>Category Score Changes</strong></summary>');
    lines.push('\n| Category | Previous | Current | Δ |');
    lines.push('|----------|----------|---------|----|');
    for (const r of catDiff) {
      const emoji = r.delta != null ? (r.delta > 0 ? '✅' : '⚠️') : '';
      lines.push(
        `| ${r.category} | ${r.previous ?? ''} | ${r.current ?? ''} | ${r.delta ?? ''} ${emoji} |`,
      );
    }
    lines.push('\n</details>');
  }
  if (metricsDiff.length) {
    lines.push('\n<details open><summary><strong>Key Metrics</strong></summary>');
    lines.push('\n| Metric | Prev (ms/score) | Curr (ms/score) | Δ (ms) | Δ Score |');
    lines.push('|--------|----------------|----------------|--------|---------|');
    for (const m of metricsDiff) {
      // For timing metrics (and CLS) lower is better -> negative delta good
      const deltaEmoji = emojiForDelta(m.delta);
      const scoreEmoji = emojiForDelta(m.scoreDelta, true); // higher score is better
      const prevStr = m.previous != null ? m.previous : '';
      const currStr = m.current != null ? m.current : '';
      lines.push(
        `| ${m.metric} | ${prevStr} | ${currStr} | ${m.delta ?? ''} ${deltaEmoji} | ${m.scoreDelta ?? ''} ${scoreEmoji} |`,
      );
    }
    lines.push('\n</details>');
  }
  const { added, removed, changed } = auditDiff;
  if (added.length) {
    lines.push(
      '\n<details open><summary><strong>New Failing/Non-Perfect Audits</strong></summary>',
    );
    lines.push('| Audit | Score | Display |');
    lines.push('|-------|-------|---------|');
    for (const a of added)
      lines.push(`| ${a.id} | ${a.current.score} | ${a.current.displayValue ?? ''} |`);
    lines.push('\n</details>');
  }
  if (removed.length) {
    lines.push('\n<details><summary><strong>Resolved Audits</strong></summary>');
    lines.push('| Audit | Previous Score |');
    lines.push('|-------|----------------|');
    for (const a of removed) lines.push(`| ${a.id} | ${a.previous.score} |`);
    lines.push('\n</details>');
  }
  if (changed.length) {
    lines.push('\n<details><summary><strong>Changed Audits</strong></summary>');
    lines.push('| Audit | Prev Score | Curr Score | Prev Value | Curr Value |');
    lines.push('|-------|-----------|------------|-----------|-----------|');
    for (const c of changed)
      lines.push(
        `| ${c.id} | ${c.previous.score} | ${c.current.score} | ${c.previous.numericValue ?? ''} | ${c.current.numericValue ?? ''} |`,
      );
    lines.push('\n</details>');
  }
  return lines.join('\n');
}

async function main() {
  const prevPath = process.env.LHCI_PREV || resolve(ROOT, 'prev-lighthouse-assertions.json');
  const currPath =
    process.env.LHCI_CURR || resolve(ROOT, 'artifacts', 'lighthouse-assertions.json');
  const outPath =
    process.env.LHCI_DIFF_MD || resolve(ROOT, 'artifacts', 'lighthouse-assertions-diff.md');
  const prev = (await loadJSON(prevPath)) || { categories: {}, audits: {} };
  const curr = (await loadJSON(currPath)) || { categories: {}, audits: {} };
  const catDiff = diffCategories(prev.categories, curr.categories);
  const auditDiff = diffAudits(prev.audits, curr.audits);
  const metricsDiff = diffMetrics(prev.metrics || {}, curr.metrics || {});
  const md = toMarkdown({ catDiff, auditDiff, metricsDiff, prev, curr });
  await writeFile(outPath, md, 'utf8');
  console.log('[lhci_diff] Wrote diff markdown to', outPath);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
