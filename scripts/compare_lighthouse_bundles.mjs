#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const root = process.cwd();
const lhDir = path.join(root, 'lighthouse');
const distFile = path.join(lhDir, 'dist', 'lighthouse-dt-bundle.js');

function sizeInfo(file) {
  const raw = fs.readFileSync(file);
  const gz = zlib.gzipSync(raw, { level: 9 });
  return { raw: raw.length, gzip: gz.length };
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function runScript(scriptName, extraEnv = {}) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  const res = spawnSync(cmd, ['run', scriptName], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (res.status !== 0) {
    throw new Error(`Script ${scriptName} failed with code ${res.status}`);
  }
}

function ensureDist() {
  if (!fs.existsSync(distFile)) {
    throw new Error('Expected dist bundle not found: ' + distFile);
  }
}

console.log('Building shimmed bundle (default) ...');
runScript('lh:build');
ensureDist();
const shimCode = fs.readFileSync(distFile, 'utf8');
const shimSizes = sizeInfo(distFile);

console.log('Building full bundle (zlib included) ...');
runScript('lh:build:full');
ensureDist();
const fullCode = fs.readFileSync(distFile, 'utf8');
const fullSizes = sizeInfo(distFile);

// Validate sentinel markers for both builds.
const sentinel = '__LH_ZLIB_MODE';
const hasShimSentinel = shimCode.includes(sentinel);
const hasFullSentinel = fullCode.includes(sentinel);
if (!hasShimSentinel || !hasFullSentinel) {
  console.warn(
    `Warning: sentinel ${sentinel} missing (shim:${hasShimSentinel} full:${hasFullSentinel})`,
  );
}

// Threshold-based regression guard.
const gzipDelta = fullSizes.gzip - shimSizes.gzip;
const rawDelta = fullSizes.raw - shimSizes.raw;
const pctDelta = (gzipDelta / shimSizes.gzip) * 100;
const rawPctDelta = (rawDelta / shimSizes.raw) * 100;
const minDeltaBytes = parseInt(process.env.LH_MIN_GZIP_DELTA_BYTES || '1', 10);
const minDeltaPct = parseFloat(process.env.LH_MIN_GZIP_DELTA_PCT || '0.05');
const minRawDeltaBytes = parseInt(process.env.LH_MIN_RAW_DELTA_BYTES || '1', 10);
const minRawDeltaPct = parseFloat(process.env.LH_MIN_RAW_DELTA_PCT || '0.05');
if (gzipDelta < minDeltaBytes) {
  throw new Error(
    `Gzip delta ${gzipDelta} < required bytes threshold ${minDeltaBytes} (set LH_MIN_GZIP_DELTA_BYTES to adjust)`,
  );
}
if (pctDelta < minDeltaPct) {
  throw new Error(
    `Gzip delta percent ${pctDelta.toFixed(3)}% < threshold ${minDeltaPct}% (set LH_MIN_GZIP_DELTA_PCT to adjust)`,
  );
}
if (rawDelta < minRawDeltaBytes) {
  throw new Error(
    `Raw delta ${rawDelta} < required bytes threshold ${minRawDeltaBytes} (set LH_MIN_RAW_DELTA_BYTES to adjust)`,
  );
}
if (rawPctDelta < minRawDeltaPct) {
  throw new Error(
    `Raw delta percent ${rawPctDelta.toFixed(3)}% < threshold ${minRawDeltaPct}% (set LH_MIN_RAW_DELTA_PCT to adjust)`,
  );
}
if (rawDelta <= 0 || gzipDelta <= 0) {
  throw new Error(
    `Expected positive raw & gzip deltas (rawDelta=${rawDelta} gzipDelta=${gzipDelta})`,
  );
}

function percentDelta(oldVal, newVal) {
  const delta = newVal - oldVal;
  const pct = (delta / oldVal) * 100;
  const sign = delta === 0 ? '' : delta > 0 ? '+' : '-';
  return `${sign}${Math.abs(delta)} bytes (${sign}${pct.toFixed(2)}%)`;
}

console.log('\nLighthouse DevTools Bundle Size Comparison');
console.log('------------------------------------------------');
console.log(`Shimmed: raw ${fmt(shimSizes.raw)} | gzip ${fmt(shimSizes.gzip)}`);
console.log(`Full   : raw ${fmt(fullSizes.raw)} | gzip ${fmt(fullSizes.gzip)}`);
console.log('\nDeltas (Full - Shimmed)');
console.log(`Raw : ${percentDelta(shimSizes.raw, fullSizes.raw)}`);
console.log(`Gzip: ${percentDelta(shimSizes.gzip, fullSizes.gzip)}`);

// Write JSON artifact for CI consumption if desired.
const artifact = {
  timestamp: new Date().toISOString(),
  shimmed: shimSizes,
  full: fullSizes,
  delta: {
    raw: fullSizes.raw - shimSizes.raw,
    gzip: fullSizes.gzip - shimSizes.gzip,
  },
};
fs.writeFileSync(
  path.join(root, 'lighthouse_bundle_sizes.json'),
  JSON.stringify(artifact, null, 2),
);
console.log('\nWrote artifact lighthouse_bundle_sizes.json');
