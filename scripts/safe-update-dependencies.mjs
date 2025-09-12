#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON = join(PROJECT_ROOT, 'package.json');
const BACKUP_FILE = join(PROJECT_ROOT, 'package.json.backup');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function backupPackageJson() {
  log('Creating backup of package.json...');
  const packageJson = readFileSync(PACKAGE_JSON, 'utf8');
  writeFileSync(BACKUP_FILE, packageJson);
  log('Backup created successfully', 'success');
}

function restorePackageJson() {
  log('Restoring package.json from backup...', 'warning');
  if (existsSync(BACKUP_FILE)) {
    const backup = readFileSync(BACKUP_FILE, 'utf8');
    writeFileSync(PACKAGE_JSON, backup);
    log('Package.json restored', 'success');
  } else {
    log('No backup found', 'error');
  }
}

function runCommand(command, description) {
  try {
    log(`Running: ${description}`);
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      encoding: 'utf8',
    });
    log(`${description} completed successfully`, 'success');
    return { success: true, output: result };
  } catch (error) {
    log(`${description} failed: ${error.message}`, 'error');
    return { success: false, error };
  }
}

function checkForUpdates(target = 'minor') {
  log(`Checking for ${target} dependency updates...`);
  const result = runCommand(`npx ncu --target ${target} --jsonUpgraded`, `Check ${target} updates`);
  return result.success ? JSON.parse(result.output || '{}') : {};
}

function updateDependencies(target = 'minor') {
  log(`Updating ${target} dependencies...`);
  return runCommand(`npx ncu --target ${target} -u`, `Update ${target} dependencies`);
}

function installDependencies() {
  log('Installing updated dependencies...');
  return runCommand('npm install', 'Install dependencies');
}

function runTests() {
  log('Running test suite...');
  const commands = [
    { cmd: 'npm run lint', desc: 'Linting' },
    { cmd: 'npm run typecheck', desc: 'Type checking' },
    { cmd: 'npm run test', desc: 'Unit tests' },
    { cmd: 'npm run build', desc: 'Build' },
  ];

  for (const { cmd, desc } of commands) {
    const result = runCommand(cmd, desc);
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}

function generateReport(updates, success, target) {
  const report = {
    timestamp: new Date().toISOString(),
    target,
    updates: Object.keys(updates).length,
    updatedPackages: updates,
    success,
    rollback: !success,
  };

  const reportPath = join(PROJECT_ROOT, 'dependency-update-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report generated: ${reportPath}`, success ? 'success' : 'error');

  return report;
}

async function main() {
  const target = process.argv[2] || 'minor';

  log(`Starting safe dependency update process (target: ${target})`);

  try {
    // Step 1: Check for updates
    const updates = checkForUpdates(target);
    if (Object.keys(updates).length === 0) {
      log('No updates available', 'warning');
      return;
    }

    log(`Found ${Object.keys(updates).length} packages to update`);

    // Step 2: Create backup
    backupPackageJson();

    // Step 3: Update dependencies
    const updateResult = updateDependencies(target);
    if (!updateResult.success) {
      throw new Error('Failed to update dependencies');
    }

    // Step 4: Install dependencies
    const installResult = installDependencies();
    if (!installResult.success) {
      throw new Error('Failed to install dependencies');
    }

    // Step 5: Run tests
    const testResult = runTests();
    if (!testResult.success) {
      throw new Error('Tests failed after dependency update');
    }

    // Step 6: Generate success report
    generateReport(updates, true, target);
    log('Dependency update completed successfully!', 'success');
  } catch (error) {
    log(`Dependency update failed: ${error.message}`, 'error');

    // Rollback on failure
    restorePackageJson();

    // Try to reinstall original dependencies
    runCommand('npm install', 'Reinstall original dependencies');

    // Generate failure report
    const updates = checkForUpdates(target);
    generateReport(updates, false, target);

    process.exit(1);
  }
}

main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
