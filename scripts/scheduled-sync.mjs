#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '60'), // Default 1 hour
  startHour: process.env.START_HOUR ? parseInt(process.env.START_HOUR) : null, // 24-hour format
  endHour: process.env.END_HOUR ? parseInt(process.env.END_HOUR) : null, // 24-hour format
  onlyIfChanges: process.env.ONLY_IF_CHANGES === 'true', // Only sync if there are changes
  maxRuns: process.env.MAX_RUNS ? parseInt(process.env.MAX_RUNS) : null, // Stop after N runs
  quiet: process.env.QUIET === 'true',
  dryRun: process.env.DRY_RUN === 'true',
};

let runCount = 0;
let intervalId = null;

function isWithinSchedule() {
  if (CONFIG.startHour === null || CONFIG.endHour === null) {
    return true; // No schedule restriction
  }

  const now = new Date();
  const currentHour = now.getHours();

  if (CONFIG.startHour <= CONFIG.endHour) {
    // Same day schedule (e.g., 9 to 17)
    return currentHour >= CONFIG.startHour && currentHour < CONFIG.endHour;
  } else {
    // Overnight schedule (e.g., 22 to 6)
    return currentHour >= CONFIG.startHour || currentHour < CONFIG.endHour;
  }
}

function hasUncommittedChanges() {
  try {
    const { execSync } = require('child_process');
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function performScheduledSync() {
  runCount++;

  if (!CONFIG.quiet) {
    console.log(`🔄 [${new Date().toISOString()}] Scheduled sync #${runCount} starting...`);
  }

  // Check schedule
  if (!isWithinSchedule()) {
    if (!CONFIG.quiet) {
      console.log(`⏰ [${new Date().toISOString()}] Outside scheduled hours, skipping`);
    }
    return;
  }

  // Check for changes if required
  if (CONFIG.onlyIfChanges && !hasUncommittedChanges()) {
    if (!CONFIG.quiet) {
      console.log(`ℹ️  [${new Date().toISOString()}] No changes detected, skipping`);
    }
    return;
  }

  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] [${new Date().toISOString()}] Would trigger auto-sync`);
    return;
  }

  const syncProcess = spawn('node', ['scripts/auto-sync.mjs'], {
    stdio: CONFIG.quiet ? 'pipe' : 'inherit',
    cwd: process.cwd(),
  });

  syncProcess.on('close', (code) => {
    if (code === 0) {
      if (!CONFIG.quiet) {
        console.log(`✅ [${new Date().toISOString()}] Scheduled sync #${runCount} completed successfully`);
      }
    } else {
      console.error(`❌ [${new Date().toISOString()}] Scheduled sync #${runCount} failed with code ${code}`);
    }

    // Check if we've reached max runs
    if (CONFIG.maxRuns && runCount >= CONFIG.maxRuns) {
      console.log(`🎯 [${new Date().toISOString()}] Reached maximum runs (${CONFIG.maxRuns}), stopping scheduler`);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.exit(0);
    }
  });

  syncProcess.on('error', (error) => {
    console.error(`❌ [${new Date().toISOString()}] Failed to start scheduled sync #${runCount}:`, error.message);
  });
}

function startScheduler() {
  console.log('⏰ Starting scheduled sync...');
  console.log(`📅 Interval: ${CONFIG.intervalMinutes} minutes`);
  if (CONFIG.startHour !== null && CONFIG.endHour !== null) {
    console.log(`🕐 Schedule: ${CONFIG.startHour}:00 - ${CONFIG.endHour}:00`);
  } else {
    console.log(`🕐 Schedule: 24/7`);
  }
  console.log(`🔍 Only if changes: ${CONFIG.onlyIfChanges}`);
  if (CONFIG.maxRuns) {
    console.log(`🎯 Max runs: ${CONFIG.maxRuns}`);
  }
  console.log(`🔇 Quiet mode: ${CONFIG.quiet}`);
  console.log(`🧪 Dry run: ${CONFIG.dryRun}`);
  console.log('');

  // Run immediately on start
  performScheduledSync();

  // Set up interval
  const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
  intervalId = setInterval(performScheduledSync, intervalMs);

  if (!CONFIG.quiet) {
    console.log(`✅ Scheduler started. Next sync in ${CONFIG.intervalMinutes} minutes.`);
    console.log('Press Ctrl+C to stop.');
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping scheduled sync...');
  if (intervalId) {
    clearInterval(intervalId);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping scheduled sync...');
  if (intervalId) {
    clearInterval(intervalId);
  }
  process.exit(0);
});

startScheduler();