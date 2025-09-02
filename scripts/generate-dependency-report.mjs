#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON = join(PROJECT_ROOT, 'package.json');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function runCommand(command) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (error) {
    return error.stdout || '';
  }
}

function getOutdatedDependencies() {
  log('Checking for outdated dependencies...');
  const output = runCommand('npm outdated --json');
  try {
    return JSON.parse(output);
  } catch {
    return {};
  }
}

function getSecurityAudit() {
  log('Running security audit...');
  const output = runCommand('npm audit --json');
  try {
    return JSON.parse(output);
  } catch {
    return { vulnerabilities: {} };
  }
}

function getPackageInfo() {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  return {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: Object.keys(packageJson.dependencies || {}),
    devDependencies: Object.keys(packageJson.devDependencies || {}),
    totalDeps: Object.keys(packageJson.dependencies || {}).length +
               Object.keys(packageJson.devDependencies || {}).length
  };
}

function generateMarkdownReport(outdated, audit, packageInfo) {
  const date = new Date().toISOString().split('T')[0];
  const outdatedCount = Object.keys(outdated).length;
  const vulnerabilities = audit.vulnerabilities || {};

  let report = `# Dependency Report - ${date}

## Project Information
- **Project**: ${packageInfo.name}
- **Version**: ${packageInfo.version}
- **Total Dependencies**: ${packageInfo.totalDeps}
- **Runtime Dependencies**: ${packageInfo.dependencies.length}
- **Dev Dependencies**: ${packageInfo.devDependencies.length}

## Security Audit
`;

  if (Object.keys(vulnerabilities).length === 0) {
    report += '✅ No security vulnerabilities found\n\n';
  } else {
    report += `⚠️  **${Object.keys(vulnerabilities).length} vulnerabilities found**\n\n`;
    Object.entries(vulnerabilities).forEach(([level, count]) => {
      report += `- ${level}: ${count}\n`;
    });
    report += '\n';
  }

  report += '## Outdated Dependencies\n\n';

  if (outdatedCount === 0) {
    report += '✅ All dependencies are up to date\n\n';
  } else {
    report += `📦 **${outdatedCount} outdated packages**\n\n`;
    report += '| Package | Current | Latest | Type |\n';
    report += '|---------|---------|--------|------|\n';

    Object.entries(outdated).forEach(([name, info]) => {
      const type = packageInfo.dependencies.includes(name) ? 'runtime' : 'dev';
      report += `| ${name} | ${info.current} | ${info.latest} | ${type} |\n`;
    });
    report += '\n';
  }

  report += '## Recommendations\n\n';

  if (outdatedCount > 0) {
    report += '### Minor Updates Available\n';
    report += 'Consider updating minor versions for bug fixes and improvements:\n';
    report += '```bash\nnpm run deps:safe-update\n```\n\n';

    const majorUpdates = Object.entries(outdated).filter(([_, info]) =>
      info.current.split('.')[0] !== info.latest.split('.')[0]
    );

    if (majorUpdates.length > 0) {
      report += '### Major Updates Available\n';
      report += 'Major version updates require careful review:\n';
      majorUpdates.forEach(([name]) => {
        report += `- ${name}\n`;
      });
      report += '\nUse: `npm run deps:safe-update:major`\n\n';
    }
  }

  if (Object.keys(vulnerabilities).length > 0) {
    report += '### Security Issues\n';
    report += 'Address security vulnerabilities immediately:\n';
    report += '```bash\nnpm audit fix\n```\n\n';
  }

  report += '## Update Commands\n\n';
  report += '```bash\n';
  report += '# Check for updates\n';
  report += 'npm run deps:check\n\n';
  report += '# Safe update with testing\n';
  report += 'npm run deps:safe-update\n\n';
  report += '# Update major versions\n';
  report += 'npm run deps:safe-update:major\n';
  report += '```\n\n';

  report += '---\n';
  report += `*Report generated on ${new Date().toISOString()}*`;

  return report;
}

function saveReport(report, filename = 'dependency-report.md') {
  const reportPath = join(PROJECT_ROOT, filename);
  writeFileSync(reportPath, report);
  log(`Report saved to: ${reportPath}`, 'success');
  return reportPath;
}

async function main() {
  log('Generating dependency report...');

  try {
    const packageInfo = getPackageInfo();
    const outdated = getOutdatedDependencies();
    const audit = getSecurityAudit();

    const report = generateMarkdownReport(outdated, audit, packageInfo);
    const reportPath = saveReport(report);

    // Output for GitHub Actions
    console.log(`::set-output name=report-path::${reportPath}`);
    console.log(`::set-output name=outdated-count::${Object.keys(outdated).length}`);
    console.log(`::set-output name=vulnerabilities::${Object.keys(audit.vulnerabilities || {}).length}`);

    log('Dependency report generated successfully', 'success');

  } catch (error) {
    log(`Failed to generate report: ${error.message}`, 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});