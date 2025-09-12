#!/usr/bin/env node

import { execSync } from 'child_process';
// no path/url utilities currently needed

// determine current script directory if needed in future
// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  remote: process.env.GIT_REMOTE || 'origin',
  branch: process.env.GIT_BRANCH || 'main',
  commitMessage: process.env.GIT_COMMIT_MESSAGE || 'Auto-sync: Update files',
  dryRun: process.env.DRY_RUN === 'true',
  force: process.env.FORCE_PUSH === 'true',
  includeUntracked: process.env.INCLUDE_UNTRACKED !== 'false', // default true
  excludePatterns: (process.env.EXCLUDE_PATTERNS || '').split(',').filter(Boolean),
};

// Safety checks
function isGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function hasRemote() {
  try {
    execSync(`git remote get-url ${CONFIG.remote}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

// Git operations
function addFiles() {
  console.log('📁 Adding files...');
  const addCommand = CONFIG.includeUntracked ? 'git add .' : 'git add -u';
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would run: ${addCommand}`);
    return;
  }
  execSync(addCommand, { stdio: 'inherit' });
}

function commitChanges() {
  console.log('💾 Committing changes...');
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would commit with message: "${CONFIG.commitMessage}"`);
    return;
  }
  try {
    execSync(`git commit -m "${CONFIG.commitMessage}"`, { stdio: 'inherit' });
  } catch (error) {
    if (error.status === 1 && error.stdout?.includes('nothing to commit')) {
      console.log('ℹ️  Nothing to commit');
      return false;
    }
    throw error;
  }
  return true;
}

function pushChanges() {
  console.log('🚀 Pushing changes...');
  const pushCommand = CONFIG.force
    ? `git push -f ${CONFIG.remote} ${CONFIG.branch}`
    : `git push ${CONFIG.remote} ${CONFIG.branch}`;
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would run: ${pushCommand}`);
    return;
  }
  execSync(pushCommand, { stdio: 'inherit' });
}

// Main sync function
async function autoSync() {
  console.log('🔄 Starting auto-sync process...\n');

  // Safety checks
  if (!isGitRepository()) {
    console.error('❌ Not a Git repository');
    process.exit(1);
  }

  if (!hasRemote()) {
    console.error(`❌ Remote '${CONFIG.remote}' not found`);
    process.exit(1);
  }

  const currentBranch = getCurrentBranch();
  if (currentBranch !== CONFIG.branch) {
    console.error(
      `❌ Current branch '${currentBranch}' does not match target branch '${CONFIG.branch}'`,
    );
    process.exit(1);
  }

  if (!hasUncommittedChanges()) {
    console.log('ℹ️  No uncommitted changes found');
    return;
  }

  console.log(`📋 Configuration:`);
  console.log(`   Remote: ${CONFIG.remote}`);
  console.log(`   Branch: ${CONFIG.branch}`);
  console.log(`   Commit message: ${CONFIG.commitMessage}`);
  console.log(`   Dry run: ${CONFIG.dryRun}`);
  console.log(`   Force push: ${CONFIG.force}`);
  console.log(`   Include untracked: ${CONFIG.includeUntracked}`);
  if (CONFIG.excludePatterns.length > 0) {
    console.log(`   Exclude patterns: ${CONFIG.excludePatterns.join(', ')}`);
  }
  console.log('');

  try {
    addFiles();
    const committed = commitChanges();
    if (committed) {
      pushChanges();
      console.log('✅ Auto-sync completed successfully');
    } else {
      console.log('ℹ️  No changes to push');
    }
  } catch (error) {
    console.error('❌ Auto-sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
autoSync().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
