#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import process from 'node:process';

// Minimal arg parsing: support --json <file> and passthrough flags (e.g. --no-engines ignored for now)
let jsonPath = null;
let lightMode = false; // triggered by --no-engines (repurposed for quick diagnostics in tests)
const args = process.argv.slice(2);
let argIndex = 0;
while (argIndex < args.length) {
  const currentArg = args[argIndex];
  if (currentArg === '--json' && args[argIndex + 1]) {
    jsonPath = args[argIndex + 1];
    argIndex += 2;
  } else if (currentArg === '--no-engines') {
    lightMode = true;
    argIndex++;
  } else {
    argIndex++;
  }
}

console.log('Preflight Validation Report');

// Environment variable checks for MCP servers
const envChecks = [
  {
    name: 'TAVILY_API_KEY',
    required: false,
    description: 'Tavily search API key (optional if TAVILY_OPTIONAL=1)',
  },
  { name: 'NOTION_API_KEY', required: true, description: 'Notion API integration token' },
  { name: 'MEM0_API_KEY', required: true, description: 'Mem0 memory service API key' },
  {
    name: 'SQLSERVER_CONNECTION_STRING',
    required: true,
    description: 'SQL Server connection string',
  },
  {
    name: 'FIREBASE_TOKEN',
    required: false,
    description: 'Firebase CLI token (optional for basic ping)',
  },
  {
    name: 'GCLOUD_TOKEN',
    required: false,
    description: 'Google Cloud token (alternative to FIREBASE_TOKEN)',
  },
  {
    name: 'GITHUB_TOKEN',
    required: false,
    description: 'GitHub API token (optional for public repos)',
  },
  {
    name: 'PIECES_API_KEY',
    required: false,
    description: 'Pieces API key (optional for basic operations)',
  },
  {
    name: 'VECTOR_DB_PATH',
    required: false,
    description: 'Vector database file path (defaults to .vectordb.jsonl)',
  },
  { name: 'MCP_SSE_PORT', required: false, description: 'SSE gateway port (defaults to 39300)' },
  {
    name: 'MCP_SSE_AUTH_TOKEN',
    required: false,
    description: 'SSE authentication token (optional)',
  },
  { name: 'MCP_SSE_INGEST_TOKEN', required: false, description: 'SSE ingestion token (optional)' },
  {
    name: 'MCP_SSE_HMAC_REDACTED_BY_AUDIT_ISSUE_70',
    required: false,
    description: 'SSE HMAC secret for integrity (optional)',
  },
];

console.log('\n--- Environment Variable Checks ---');
let envOk = true;
for (const check of envChecks) {
  const value = process.env[check.name];
  const hasValue = Boolean(value && value.trim());
  let status;
  if (hasValue) {
    status = '✓';
  } else if (check.required) {
    status = '✗ MISSING';
  } else {
    status = '⚠ OPTIONAL';
  }

  console.log(`${status} ${check.name}: ${check.description}`);
  if (check.required && !hasValue) {
    envOk = false;
  }
}

const steps = lightMode
  ? [
      { name: 'Lint', cmd: ['echo', '(light) lint skipped'] },
      { name: 'TypeCheck', cmd: ['echo', '(light) typecheck skipped'] },
      { name: 'Unit Tests', cmd: ['echo', '(light) tests skipped'] },
    ]
  : [
      { name: 'Lint', cmd: ['npm', 'run', 'lint'] },
      { name: 'TypeCheck', cmd: ['npm', 'run', 'typecheck'] },
      { name: 'Unit Tests', cmd: ['npm', 'run', 'test'] },
      { name: 'Coverage Diff', cmd: ['npm', 'run', 'coverage:diff'] },
      { name: 'Bundle Heuristic (if relevant)', cmd: ['npm', 'run', 'lh:verify-bundles'] },
    ];

let allStepsPassed = true;
for (const s of steps) {
  console.log(`\n--- ${s.name} ---`);
  try {
    const [cmd, ...cmdArgs] = s.cmd;
    const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env, shell: false });
    if (res.status !== 0) throw new Error(`${cmd} exited ${res.status}`);
  } catch (e) {
    console.error(`${s.name} failed: ${e.message || e}`);
    allStepsPassed = false;
  }
}

// Diagnostics object (extendable in future)
const diagnostics = {
  nodePathDiagnostics: {
    hasConcreteNode: (() => {
      try {
        const vRes = spawnSync('node', ['--version'], { stdio: 'pipe' });
        if (vRes.status !== 0) return false;
        const v = vRes.stdout.toString().trim();
        return /^v?\d+\.\d+\.\d+/.test(v);
      } catch (error) {
        console.warn(`[preflight] Node.js check failed: ${error.message}`);
        return false;
      }
    })(),
  },
  environmentVariables: envChecks.reduce((acc, check) => {
    acc[check.name] = {
      present: Boolean(process.env[check.name]),
      required: check.required,
      description: check.description,
    };
    return acc;
  }, {}),
};

if (jsonPath) {
  try {
    writeFileSync(jsonPath, JSON.stringify(diagnostics, null, 2));
  } catch (e) {
    console.error('Failed to write diagnostics JSON:', e.message || e);
  }
}

if (!allStepsPassed || !envOk) {
  console.error('\nPreflight failed. Fix issues above.');
  process.exit(1);
}
console.log('\nPreflight succeeded.');
