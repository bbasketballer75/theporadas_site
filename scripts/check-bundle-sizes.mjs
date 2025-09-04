#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Bundle size thresholds in KB
const THRESHOLDS = {
  'index-*.js': 500, // Main bundle
  'react-vendor-*.js': 300, // React vendor
  'd3-vendor-*.js': 200, // D3 vendor
  'firebase-vendor-*.js': 250, // Firebase vendor
  'other-vendor-*.js': 150, // Other vendor
  'Map-*.js': 200, // Map component bundle
  'FamilyTree-*.js': 100, // Family tree bundle
  '*.css': 100, // CSS files
};

const distDir = path.join(process.cwd(), 'dist');
let hasWarnings = false;
let hasErrors = false;
const results = [];

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkFileSize(filePath, pattern, threshold) {
  const stat = fs.statSync(filePath);
  const sizeKB = stat.size / 1024;
  const fileName = path.basename(filePath);
  const exceeded = sizeKB > threshold;

  const result = {
    file: fileName,
    pattern,
    size: stat.size,
    sizeKB: Math.round(sizeKB * 100) / 100,
    threshold,
    exceeded,
    delta: Math.round((sizeKB - threshold) * 100) / 100
  };

  results.push(result);

  if (exceeded) {
    console.warn(`⚠️  Bundle size warning: ${fileName} (${formatBytes(stat.size)}) exceeds threshold of ${threshold}KB by ${result.delta}KB`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${fileName}: ${formatBytes(stat.size)} (within ${threshold}KB limit)`);
  }
}

function checkBundleSizes() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist directory not found. Run build first.');
    process.exit(1);
  }

  console.log('🔍 Checking bundle sizes...\n');

  for (const [pattern, threshold] of Object.entries(THRESHOLDS)) {
    const files = fs.readdirSync(path.join(distDir, 'assets')).filter(file => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(file);
    });

    files.forEach(file => {
      const filePath = path.join(distDir, 'assets', file);
      checkFileSize(filePath, pattern, threshold);
    });
  }

  // Generate summary
  const exceededFiles = results.filter(r => r.exceeded);
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const totalSizeKB = Math.round((totalSize / 1024) * 100) / 100;

  console.log('\n📊 Bundle Size Summary:');
  console.log(`Total bundle size: ${formatBytes(totalSize)} (${totalSizeKB}KB)`);
  console.log(`Files checked: ${results.length}`);
  console.log(`Files exceeding threshold: ${exceededFiles.length}`);

  if (exceededFiles.length > 0) {
    console.log('\n🚨 Files exceeding thresholds:');
    exceededFiles.forEach(file => {
      console.log(`  - ${file.file}: ${file.sizeKB}KB (threshold: ${file.threshold}KB, exceeded by: ${file.delta}KB)`);
    });
  }

  // Output JSON for CI consumption
  const output = {
    timestamp: new Date().toISOString(),
    totalSize,
    totalSizeKB,
    files: results,
    exceededCount: exceededFiles.length,
    hasWarnings,
    hasErrors
  };

  // Write JSON output to file for CI
  fs.writeFileSync('bundle-sizes.json', JSON.stringify(output, null, 2));
  console.log('\n💾 Bundle size data saved to bundle-sizes.json');

  console.log('\n' + (hasWarnings ? '⚠️  Some bundles exceed size thresholds' : '✅ All bundles within size limits'));
  process.exit(hasWarnings ? 1 : 0);
}

checkBundleSizes();