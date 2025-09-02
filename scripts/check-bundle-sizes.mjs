#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Bundle size thresholds in KB
const THRESHOLDS = {
  'assets/index-*.js': 500, // Main bundle
  'assets/react-vendor-*.js': 300, // React vendor
  'assets/d3-vendor-*.js': 200, // D3 vendor
  'assets/firebase-vendor-*.js': 250, // Firebase vendor
  'assets/other-vendor-*.js': 150, // Other vendor
  'assets/*.css': 100, // CSS files
};

const distDir = path.join(process.cwd(), 'dist');
let hasWarnings = false;

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

  if (sizeKB > threshold) {
    console.warn(`⚠️  Bundle size warning: ${path.basename(filePath)} (${formatBytes(stat.size)}) exceeds threshold of ${threshold}KB`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${path.basename(filePath)}: ${formatBytes(stat.size)} (within ${threshold}KB limit)`);
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

  console.log('\n' + (hasWarnings ? '⚠️  Some bundles exceed size thresholds' : '✅ All bundles within size limits'));
  process.exit(hasWarnings ? 1 : 0);
}

checkBundleSizes();