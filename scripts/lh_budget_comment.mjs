#!/usr/bin/env node
import fs from 'fs';

const reportPath = 'lh-report.json';
if (!fs.existsSync(reportPath)) {
  console.error('Lighthouse report not found');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
// Budgets audits live under audits keyed by 'performance-budget' & 'timing-budget' in older versions
const audits = json.audits || {};

// Build simple summary using categories + selected metrics
const categories = json.categories || {};
function catScore(id) {
  return categories[id] ? (categories[id].score * 100).toFixed(0) : 'n/a';
}

const metrics = [
  ['First Contentful Paint', 'first-contentful-paint'],
  ['Largest Contentful Paint', 'largest-contentful-paint'],
  ['Total Blocking Time', 'total-blocking-time'],
  ['Cumulative Layout Shift', 'cumulative-layout-shift'],
  ['Speed Index', 'speed-index'],
];

const lines = [];
lines.push('Lighthouse Budgets & Key Metrics');
lines.push('');
lines.push(
  `Performance: ${catScore('performance')} | Accessibility: ${catScore('accessibility')} | Best Practices: ${catScore('best-practices')} | SEO: ${catScore('seo')}`,
);
lines.push('');
lines.push('| Metric | Value |');
lines.push('|--------|-------|');
for (const [label, key] of metrics) {
  const a = audits[key];
  if (!a) continue;
  const display = a.displayValue || a.numericValue;
  lines.push(`| ${label} | ${display} |`);
}

// Attempt to surface budget overages if budgets section exists
const budgets = json.audits?.['performance-budget']?.details?.items || [];
const timingBudgets = json.audits?.['timing-budget']?.details?.items || [];
const overages = [];
for (const item of budgets) {
  if (item.sizeOverBudget && item.sizeOverBudget > 0) {
    overages.push({
      type: 'resource',
      resourceType: item.resourceType,
      over: item.sizeOverBudget,
      budget: item.budget,
      actual: item.size,
    });
  }
}
for (const item of timingBudgets) {
  if (item.overBudget && item.overBudget > 0) {
    overages.push({
      type: 'timing',
      metric: item.metric,
      over: item.overBudget,
      budget: item.budget,
      actual: item.measurement,
    });
  }
}

if (overages.length) {
  lines.push('');
  lines.push('#### Budget Overages');
  lines.push('');
  lines.push('| Kind | Name | Over | Actual | Budget |');
  lines.push('|------|------|-----:|-------:|-------:|');
  for (const o of overages) {
    const name = o.type === 'resource' ? o.resourceType : o.metric;
    lines.push(`| ${o.type} | ${name} | ${o.over} | ${o.actual} | ${o.budget} |`);
  }
  // GitHub annotation emulation: write a file for action to parse (optional future)
  const annotation = overages
    .map(
      (o) =>
        `${o.type.toUpperCase()} budget exceeded: ${o.type === 'resource' ? o.resourceType : o.metric} over by ${o.over}`,
    )
    .join('\n');
  fs.writeFileSync('lighthouse-budget-overages.txt', annotation);
}

fs.writeFileSync('lighthouse-summary.md', lines.join('\n'));
console.log(lines.join('\n'));
