#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  watchPath: process.env.WATCH_PATH || '.',
  debounceMs: parseInt(process.env.DEBOUNCE_MS || '1000'),
  maxWaitMs: parseInt(process.env.MAX_WAIT_MS || '5000'),
  excludePatterns: (process.env.EXCLUDE_PATTERNS || 'node_modules,.git,dist,build,.next').split(',').filter(Boolean),
  includePatterns: (process.env.INCLUDE_PATTERNS || '').split(',').filter(Boolean),
  quiet: process.env.QUIET === 'true',
};

// Debounce mechanism
let debounceTimer = null;
let lastSyncTime = 0;
let pendingChanges = new Set();

function shouldExclude(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);

  // Check exclude patterns
  for (const pattern of CONFIG.excludePatterns) {
    if (relativePath.includes(pattern)) {
      return true;
    }
  }

  // Check include patterns (if specified, only include matching files)
  if (CONFIG.includePatterns.length > 0) {
    let shouldInclude = false;
    for (const pattern of CONFIG.includePatterns) {
      if (relativePath.includes(pattern)) {
        shouldInclude = true;
        break;
      }
    }
    if (!shouldInclude) {
      return true;
    }
  }

  return false;
}

function triggerSync() {
  const now = Date.now();
  const timeSinceLastSync = now - lastSyncTime;

  if (timeSinceLastSync < CONFIG.debounceMs) {
    // Debounce: schedule sync after debounce period
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSync();
    }, CONFIG.debounceMs - timeSinceLastSync);
  } else if (timeSinceLastSync < CONFIG.maxWaitMs) {
    // Within max wait, debounce
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSync();
    }, CONFIG.debounceMs);
  } else {
    // Max wait exceeded, sync immediately
    performSync();
  }
}

function performSync() {
  lastSyncTime = Date.now();
  pendingChanges.clear();

  if (!CONFIG.quiet) {
    console.log(`🔄 [${new Date().toISOString()}] Triggering auto-sync...`);
  }

  const syncProcess = spawn('node', ['scripts/auto-sync.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  syncProcess.on('close', (code) => {
    if (code === 0) {
      if (!CONFIG.quiet) {
        console.log(`✅ [${new Date().toISOString()}] Sync completed successfully`);
      }
    } else {
      console.error(`❌ [${new Date().toISOString()}] Sync failed with code ${code}`);
    }
  });

  syncProcess.on('error', (error) => {
    console.error(`❌ [${new Date().toISOString()}] Failed to start sync:`, error.message);
  });
}

function handleFileChange(eventType, filename) {
  if (!filename) return;

  const filePath = path.resolve(CONFIG.watchPath, filename);

  // Check if file should be excluded
  if (shouldExclude(filePath)) {
    return;
  }

  // Skip if it's a directory change we don't care about
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return;
    }
  } catch {
    // File might have been deleted, still process
  }

  pendingChanges.add(filePath);

  if (!CONFIG.quiet) {
    console.log(`📁 [${new Date().toISOString()}] Detected change: ${filename}`);
  }

  triggerSync();
}

function startWatching() {
  console.log('👀 Starting file watcher...');
  console.log(`📍 Watching: ${path.resolve(CONFIG.watchPath)}`);
  console.log(`⏱️  Debounce: ${CONFIG.debounceMs}ms`);
  console.log(`⏳ Max wait: ${CONFIG.maxWaitMs}ms`);
  if (CONFIG.excludePatterns.length > 0) {
    console.log(`🚫 Excluding: ${CONFIG.excludePatterns.join(', ')}`);
  }
  if (CONFIG.includePatterns.length > 0) {
    console.log(`✅ Including only: ${CONFIG.includePatterns.join(', ')}`);
  }
  console.log('');

  try {
    const watcher = fs.watch(CONFIG.watchPath, { recursive: true }, handleFileChange);

    watcher.on('error', (error) => {
      console.error('❌ Watcher error:', error.message);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping file watcher...');
      watcher.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping file watcher...');
      watcher.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start watcher:', error.message);
    process.exit(1);
  }
}

// Safety check
function isGitRepository() {
  try {
    require('child_process').execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!isGitRepository()) {
  console.error('❌ Not a Git repository');
  process.exit(1);
}

startWatching();