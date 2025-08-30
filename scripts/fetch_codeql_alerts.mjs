#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const owner = 'bbasketballer75';
const repo = 'theporadas_site';
const perPage = process.env.CODEQL_ALERTS_PER_PAGE || '100';
const outfile = process.env.CODEQL_ALERTS_OUTFILE || 'codeql_alerts.json';

const args = [
  'api',
  '-H',
  'Accept: application/vnd.github+json',
  `repos/${owner}/${repo}/code-scanning/alerts?per_page=${perPage}`,
];

execFile('gh', args, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error('Failed to fetch CodeQL alerts via gh api:', err.message);
    if (stderr) console.error(stderr);
    process.exitCode = 1;
    return;
  }
  try {
    JSON.parse(stdout);
  } catch (error) {
    console.error(`Received invalid JSON payload from gh api: ${error.message}. Aborting write.`);
    process.exitCode = 2;
    return;
  }
  writeFileSync(outfile, stdout, 'utf8');
  console.log(`Wrote ${stdout.length} bytes to ${outfile}`);
});
