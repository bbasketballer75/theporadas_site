#!/usr/bin/env node
/*
 Scans repository for process.env usages and updates docs/mcp_servers.md
 between <!-- ENV_VARS_AUTO_START --> and <!-- ENV_VARS_AUTO_END --> markers
 with a markdown table of variables, defaults, and descriptions.
*/
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const repoRoot = process.cwd();
const DOC_PATH = path.join(repoRoot, 'docs', 'mcp_servers.md');

// Seed descriptions (extend as needed)
const DESCRIPTIONS = {
  MCP_INCLUDE_SSE: 'Include the SSE gateway under supervisor when set to 1',
  MCP_SSE_PORT: 'Port for the SSE gateway HTTP server',
  MCP_SSE_HEARTBEAT_MS: 'Heartbeat interval (ms) for SSE keepalive events',
  MCP_SSE_RING_MAX: 'Maximum number of events retained in ring buffer',
  MCP_SSE_AUTH_TOKEN: 'Bearer token required for SSE subscription (if set)',
  MCP_SSE_INGEST_TOKEN: 'Bearer token required for ingestion (defaults to auth token)',
  MCP_SSE_HMAC_REDACTED_BY_AUDIT_ISSUE_70: 'Optional HMAC secret; adds X-MCP-Signature header to ingested events',
  MCP_SSE_VERSION: 'Version segment used for versioned SSE paths',
  MCP_FS_ROOT: 'Root directory for filesystem server operations',
  MCP_FS_MAX_BYTES: 'Maximum allowed file size (bytes) for writes; unset for no limit',
  MCP_FS_ALLOW_WRITE_GLOBS: 'Comma-separated glob patterns allowed for write operations',
  MCP_SERVER_NAME: 'Override server name advertised in readiness event',
  TAVILY_API_URL: 'Override Tavily API base URL',
  TAVILY_API_KEY: 'Tavily API key (required unless TAVILY_OPTIONAL=1)',
  TAVILY_OPTIONAL: 'Allow degraded mode without API key when set to 1',
  TAVILY_FORCE_CRASH: 'Testing flag to force Tavily server crash on startup',
  TAVILY_MOCK_SCENARIO: 'Testing scenario selector for mock Tavily responses',
  VECTOR_DB_PATH: 'Path to vector DB JSONL storage file',
  LH_ALLOWED_DELTA: 'Allowed Lighthouse metric delta (quality regression check)',
  LH_METRIC_REGRESSION_PCT: 'Percentage threshold for Lighthouse metric regression',
  GITHUB_REPOSITORY: 'GitHub repository owner/name (CI context)',
  GITHUB_TOKEN: 'GitHub token for workflow verification scripts',
  GITHUB_APP_INSTALLATION_TOKEN: 'GitHub App installation token (alternative auth)',
  GITHUB_STEP_SUMMARY: 'File path for GitHub Actions step summary output',
};

function collectEnvUsages() {
  // Use git grep for performance & consistency
  const cmd = 'git --no-pager grep -h "process.env."';
  let out = '';
  try {
    out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) {
    out = e.stdout?.toString() || '';
  }
  const re = /process\.env\.(\w+)/g;
  const set = new Set();
  for (const line of out.split(/\n/)) {
    let m;
    while ((m = re.exec(line))) set.add(m[1]);
  }
  return Array.from(set).sort();
}

function buildTable(vars) {
  const header = '| Variable | Default | Description |\n|----------|---------|-------------|';
  const rows = vars.map((v) => {
    let def = '';
    // Attempt to extract default from code via secondary grep
    try {
      const pattern = `process\\.env\\.${v}[^\n]*`;
      const lines = execSync(`git --no-pager grep -h "${pattern}"`, { encoding: 'utf8' })
        .split(/\n/)
        .filter(Boolean);
      const defaultMatch = lines
        .map((l) => l.match(/\|\|\s*['"]([^'"]+)['"]/))
        .find(Boolean);
      if (defaultMatch) def = defaultMatch[1];
      else if (lines.some((l) => /===?\s*'1'/.test(l))) def = '1?';
    } catch {
      // ignore
    }
    const desc = DESCRIPTIONS[v] || '';
    return `| ${v} | ${def} | ${desc} |`;
  });
  return [header, ...rows].join('\n');
}

function updateDoc(table) {
  const content = readFileSync(DOC_PATH, 'utf8');
  const startTag = '<!-- ENV_VARS_AUTO_START -->';
  const endTag = '<!-- ENV_VARS_AUTO_END -->';
  if (!content.includes(startTag) || !content.includes(endTag)) {
    throw new Error('Marker tags not found in ' + DOC_PATH);
  }
  const newContent = content.replace(
    new RegExp(`${startTag}[\n\r]*[\s\S]*?${endTag}`),
    `${startTag}\n\n${table}\n\n${endTag}`,
  );
  writeFileSync(DOC_PATH, newContent);
}

const vars = collectEnvUsages();
const table = buildTable(vars);
updateDoc(table);
console.log('Updated env var documentation with', vars.length, 'variables.');
