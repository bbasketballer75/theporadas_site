#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Simple color scale (adjustable)
function colorFor(pct) {
  if (pct >= 90) return '#4c1';
  if (pct >= 80) return '#97CA00';
  if (pct >= 70) return '#dfb317';
  if (pct >= 60) return '#fe7d37';
  return '#e05d44';
}

function main() {
  const summaryPath = resolve('coverage/coverage-summary.json');
  let pct = null;
  try {
    const raw = readFileSync(summaryPath, 'utf8');
    const json = JSON.parse(raw);
    // Prefer lines percentage
    pct = json.total?.lines?.pct ?? null;
  } catch (e) {
    console.error('Could not read coverage summary:', e.message);
    process.exit(1);
  }
  if (pct == null) {
    console.error('No lines.pct value found in coverage summary.');
    process.exit(1);
  }
  const pctStr = pct.toFixed(0) + '%';
  const color = colorFor(pct);

  // Basic badge SVG (inspired by shields.io style_flat) with dynamic width
  const label = 'coverage';
  // Approximate character width mapping (rough, monospace-ish simplification)
  const charWidth = (ch) => {
    if (/[il1]/.test(ch)) return 4;
    if (/\d/.test(ch)) return 7;
    if (ch === '%') return 7;
    if (ch === ' ') return 3;
    return 7; // default average
  };
  const textWidth = (s) => s.split('').reduce((a, c) => a + charWidth(c), 0);
  const pad = 10; // horizontal padding
  const labelWidth = textWidth(label) + pad;
  const valueWidth = textWidth(pctStr) + pad;
  const totalWidth = labelWidth + valueWidth;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${pctStr}">\n  <title>${label}: ${pctStr}</title>\n  <linearGradient id="s" x2="0" y2="100%">\n    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>\n    <stop offset="1" stop-opacity=".1"/>\n  </linearGradient>\n  <mask id="m"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></mask>\n  <g mask="url(#m)">\n    <rect width="${labelWidth}" height="20" fill="#555"/>\n    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>\n    <rect width="${totalWidth}" height="20" fill="url(#s)"/>\n  </g>\n  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">\n    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>\n    <text x="${labelWidth / 2}" y="14">${label}</text>\n    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${pctStr}</text>\n    <text x="${labelWidth + valueWidth / 2}" y="14">${pctStr}</text>\n  </g>\n</svg>\n`;

  const outPath = resolve('.github/badges/coverage.svg');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, 'utf8');
  console.log('Wrote badge to', outPath, 'with value', pctStr);
}

main();
