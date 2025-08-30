#!/usr/bin/env node
/**
 * Fetch Code Scanning alerts using a GitHub App installation token.
 *
 * Requirements (environment variables):
 *   GITHUB_APP_ID          - Numeric App ID
 *   GITHUB_APP_PRIVATE_KEY - PEM contents (with literal newlines or \n escapes)
 *   GITHUB_INSTALLATION_ID - Installation ID for the target repo owner/repo
 *   GITHUB_REPOSITORY      - owner/repo (defaults to process.env.GITHUB_REPOSITORY)
 *
 * Optional:
 *   PER_PAGE (default 100)
 *   OUTPUT (json|table) default table
 *
 * Permissions: App must have "Security events: Read" for the repository.
 */
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const appId = requireEnv('GITHUB_APP_ID');
let privateKey = requireEnv('GITHUB_APP_PRIVATE_KEY');
// Support keys provided with literal \n sequences (common in Actions secrets)
if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
const installationId = requireEnv('GITHUB_INSTALLATION_ID');
const repository = process.env.GITHUB_REPOSITORY || requireEnv('GITHUB_REPOSITORY');
const [owner, repo] = repository.split('/');
const perPage = parseInt(process.env.PER_PAGE || '100', 10);
const output = (process.env.OUTPUT || 'table').toLowerCase();

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId,
    privateKey,
    installationId,
  },
});

async function fetchAlerts() {
  const alerts = [];
  let page = 1;
  for (;;) {
    const res = await octokit.request('GET /repos/{owner}/{repo}/code-scanning/alerts', {
      owner,
      repo,
      per_page: perPage,
      page,
    });
    if (!Array.isArray(res.data) || res.data.length === 0) break;
    alerts.push(...res.data);
    if (res.data.length < perPage) break;
    page += 1;
  }
  return alerts;
}

function summarize(alerts) {
  const counts = {};
  for (const a of alerts) {
    const severity = a.rule?.security_severity_level || a.rule?.severity || 'unknown';
    counts[severity] = (counts[severity] || 0) + 1;
  }
  return counts;
}

function printTable(alerts) {
  const rows = alerts.map((a) => ({
    number: a.number,
    rule: a.rule?.id,
    severity: a.rule?.security_severity_level || a.rule?.severity,
    state: a.state,
    created: a.created_at,
    html_url: a.html_url,
  }));
  console.table(rows);
  console.log('Summary:', summarize(alerts));
}

(async () => {
  try {
    const alerts = await fetchAlerts();
    if (output === 'json') {
      console.log(
        JSON.stringify(
          {
            repository,
            count: alerts.length,
            summary: summarize(alerts),
            alerts,
          },
          null,
          2,
        ),
      );
    } else {
      printTable(alerts);
    }
    if (alerts.length === 0) {
      console.error('No code scanning alerts found.');
    }
  } catch (err) {
    console.error('Error fetching code scanning alerts via GitHub App:', err.message);
    process.exitCode = 1;
  }
})();
