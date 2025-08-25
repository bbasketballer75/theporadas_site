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
const perfBudget = audits['resource-summary'] ? audits['resource-summary'] : null;

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
lines.push(`Performance: ${catScore('performance')} | Accessibility: ${catScore('accessibility')} | Best Practices: ${catScore('best-practices')} | SEO: ${catScore('seo')}`);
lines.push('');
lines.push('| Metric | Value |');
lines.push('|--------|-------|');
for (const [label, key] of metrics) {
  const a = audits[key];
  if (!a) continue;
  const display = a.displayValue || a.numericValue;
  lines.push(`| ${label} | ${display} |`);
}

fs.writeFileSync('lighthouse-summary.md', lines.join('\n'));
console.log(lines.join('\n'));
