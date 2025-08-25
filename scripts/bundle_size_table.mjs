#!/usr/bin/env node
import fs from 'fs';

const file = 'lighthouse_bundle_sizes.json';
if (!fs.existsSync(file)) {
  console.error('Bundle size JSON not found');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const { shimmed, full, delta } = data;
function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
const lines = [];
lines.push('### Lighthouse DevTools Bundle Sizes');
lines.push('');
lines.push('| Build | Raw | Gzip |');
lines.push('|-------|-----|------|');
lines.push(`| Shimmed | ${fmt(shimmed.raw)} | ${fmt(shimmed.gzip)} |`);
lines.push(`| Full | ${fmt(full.raw)} | ${fmt(full.gzip)} |`);
lines.push('');
lines.push('**Delta (Full - Shimmed)**');
lines.push('');
lines.push('| Metric | Bytes |');
lines.push('|--------|-------|');
lines.push(`| Raw | ${delta.raw} |`);
lines.push(`| Gzip | ${delta.gzip} |`);
fs.writeFileSync('bundle-size-table.md', lines.join('\n'));
console.log(lines.join('\n'));
