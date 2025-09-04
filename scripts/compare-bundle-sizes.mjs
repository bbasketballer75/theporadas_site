#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDelta(delta) {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}KB`;
}

function compareBundleSizes(currentPath, baselinePath) {
  if (!fs.existsSync(currentPath)) {
    console.error(`❌ Current bundle sizes file not found: ${currentPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(baselinePath)) {
    console.log(`⚠️  Baseline bundle sizes file not found: ${baselinePath}`);
    console.log('This is likely the first run. No comparison available.');
    return;
  }

  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  console.log('🔄 Comparing bundle sizes against baseline...\n');

  // Create a map of baseline files for easy lookup
  const baselineMap = new Map();
  baseline.files.forEach(file => {
    baselineMap.set(file.file, file);
  });

  const comparisons = [];
  let totalDelta = 0;
  let increasedCount = 0;
  let decreasedCount = 0;

  current.files.forEach(currentFile => {
    const baselineFile = baselineMap.get(currentFile.file);
    if (baselineFile) {
      const delta = currentFile.sizeKB - baselineFile.sizeKB;
      totalDelta += delta;

      if (delta > 0) increasedCount++;
      else if (delta < 0) decreasedCount++;

      comparisons.push({
        file: currentFile.file,
        currentSize: currentFile.sizeKB,
        baselineSize: baselineFile.sizeKB,
        delta,
        exceeded: currentFile.exceeded,
        baselineExceeded: baselineFile.exceeded
      });
    } else {
      // New file
      comparisons.push({
        file: currentFile.file,
        currentSize: currentFile.sizeKB,
        baselineSize: 0,
        delta: currentFile.sizeKB,
        exceeded: currentFile.exceeded,
        baselineExceeded: false,
        isNew: true
      });
      totalDelta += currentFile.sizeKB;
      increasedCount++;
    }
  });

  // Check for removed files
  baseline.files.forEach(baselineFile => {
    const exists = current.files.some(f => f.file === baselineFile.file);
    if (!exists) {
      comparisons.push({
        file: baselineFile.file,
        currentSize: 0,
        baselineSize: baselineFile.sizeKB,
        delta: -baselineFile.sizeKB,
        exceeded: false,
        baselineExceeded: baselineFile.exceeded,
        isRemoved: true
      });
      totalDelta -= baselineFile.sizeKB;
      decreasedCount++;
    }
  });

  // Sort by absolute delta (largest changes first)
  comparisons.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  console.log('📊 Bundle Size Comparison Results:');
  console.log(`Baseline: ${new Date(baseline.timestamp).toLocaleString()}`);
  console.log(`Current:  ${new Date(current.timestamp).toLocaleString()}`);
  console.log('');

  console.log('| File | Current | Baseline | Change | Status |');
  console.log('|------|---------|----------|--------|--------|');

  comparisons.forEach(comp => {
    const status = comp.isNew ? '🆕 New' :
                   comp.isRemoved ? '🗑️ Removed' :
                   comp.delta > 0 ? '📈 Increased' :
                   comp.delta < 0 ? '📉 Decreased' : '➡️ Unchanged';

    const currentSize = comp.isRemoved ? '-' : `${comp.currentSize}KB`;
    const baselineSize = comp.isNew ? '-' : `${comp.baselineSize}KB`;
    const delta = comp.isRemoved || comp.isNew ? formatDelta(comp.delta) : formatDelta(comp.delta);

    console.log(`| ${comp.file} | ${currentSize} | ${baselineSize} | ${delta} | ${status} |`);
  });

  console.log('');
  console.log('📈 Summary:');
  console.log(`Total bundle size change: ${formatDelta(totalDelta)}`);
  console.log(`Files increased: ${increasedCount}`);
  console.log(`Files decreased: ${decreasedCount}`);
  console.log(`Files unchanged: ${comparisons.length - increasedCount - decreasedCount}`);

  // Check for threshold violations
  const currentExceeded = current.files.filter(f => f.exceeded);
  const baselineExceeded = baseline.files.filter(f => f.exceeded);

  if (currentExceeded.length > 0) {
    console.log('');
    console.log('🚨 Current Threshold Violations:');
    currentExceeded.forEach(file => {
      console.log(`  - ${file.file}: ${file.sizeKB}KB (threshold: ${file.threshold}KB)`);
    });
  }

  if (baselineExceeded.length !== currentExceeded.length) {
    console.log('');
    console.log('ℹ️  Threshold violation change:');
    console.log(`  Baseline violations: ${baselineExceeded.length}`);
    console.log(`  Current violations: ${currentExceeded.length}`);
  }

  // Save comparison results
  const comparisonResult = {
    timestamp: new Date().toISOString(),
    baselineTimestamp: baseline.timestamp,
    currentTimestamp: current.timestamp,
    totalDelta,
    increasedCount,
    decreasedCount,
    unchangedCount: comparisons.length - increasedCount - decreasedCount,
    currentViolations: currentExceeded.length,
    baselineViolations: baselineExceeded.length,
    comparisons
  };

  fs.writeFileSync('bundle-size-comparison.json', JSON.stringify(comparisonResult, null, 2));
  console.log('');
  console.log('💾 Comparison data saved to bundle-size-comparison.json');
}

// Main execution
const args = process.argv.slice(2);
const currentPath = args[0] || 'bundle-sizes.json';
const baselinePath = args[1] || 'bundle-sizes-baseline.json';

compareBundleSizes(currentPath, baselinePath);