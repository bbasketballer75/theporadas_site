#!/usr/bin/env node
// Wrapper that starts @modelcontextprotocol/server-filesystem and emits a standard ready event even
// if underlying process exits quickly. If the underlying exits immediately (non-zero), we surface an error.
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const root = process.argv[2] || process.cwd();

// Resolve the locally installed binary path. On Windows there will be a .cmd shim.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// projectRoot assumed two levels up from scripts folder; safer to traverse until package.json? For now rely on cwd.
const binBase = join(process.cwd(), 'node_modules', '.bin', 'mcp-server-filesystem');
const shimCmd = `${binBase}.cmd`;
const shimPs1 = `${binBase}.ps1`;
const jsEntry = join(
  process.cwd(),
  'node_modules',
  '@modelcontextprotocol',
  'server-filesystem',
  'dist',
  'index.js',
);

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// Determine best execution strategy
let execType = 'unknown';
let command;
let args;
let spawnOptions = { stdio: ['ignore', 'pipe', 'pipe'] };
if (process.platform === 'win32') {
  if (fileExists(shimCmd)) {
    command = shimCmd;
    args = [root];
    execType = 'shim-cmd';
  } else if (fileExists(shimPs1)) {
    // Use PowerShell to invoke ps1 script
    command = 'pwsh';
    args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', shimPs1, root];
    execType = 'shim-ps1';
  } else {
    command = process.execPath; // node
    args = [jsEntry, root];
    execType = 'node-js-fallback';
  }
  // Sometimes direct spawning of .cmd can yield EINVAL depending on shell; try shell spawn if fails.
  spawnOptions.shell = false;
} else {
  if (fileExists(binBase)) {
    command = binBase;
    args = [root];
    execType = 'shim';
  } else {
    command = process.execPath;
    args = [jsEntry, root];
    execType = 'node-js-fallback';
  }
}

function emitDiag(extra) {
  process.stdout.write(
    JSON.stringify({
      type: 'event',
      level: 'debug',
      service: 'filesystem-upstream-wrapper',
      execType,
      command,
      args,
      ...extra,
    }) + '\n',
  );
}

emitDiag({ stage: 'spawn-attempt' });
let child = spawn(command, args, spawnOptions);
child.on('error', (err) => {
  // Retry with shell=true if first attempt on Windows .cmd produced EINVAL
  if (
    process.platform === 'win32' &&
    execType === 'shim-cmd' &&
    (err.code === 'EINVAL' || err.code === 'ENOENT')
  ) {
    emitDiag({ stage: 'retry-shell', error: err.message });
    spawnOptions.shell = true;
    child = spawn(command, args, spawnOptions);
    attach(child);
    return;
  }
  emitDiag({ stage: 'spawn-error', error: err.message, code: err.code });
});

function attach(proc) {
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', handleStdout);
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (d) => {
    stderr += d.toString();
  });
  proc.on('exit', handleExit);
}

const argsOriginal = args;
let readyEmitted = false;
let stderr = '';
function handleStdout(d) {
  const text = d.toString();
  if (!readyEmitted && /Secure MCP Filesystem Server running/i.test(text)) {
    readyEmitted = true;
    process.stdout.write(
      JSON.stringify({
        type: 'ready',
        methods: [],
        schema: { service: 'filesystem-upstream', execType },
      }) + '\n',
    );
  }
  process.stderr.write(text);
}
function handleExit(code) {
  if (!readyEmitted) {
    process.stdout.write(
      JSON.stringify({
        type: 'ready',
        methods: [],
        schema: {
          service: 'filesystem-upstream',
          degraded: true,
          exitCode: code,
          stderr,
          execType,
        },
      }) + '\n',
    );
  }
  if (code === 0) {
    setTimeout(() => process.exit(0), 60000);
  } else {
    setTimeout(() => process.exit(code || 1), 500);
  }
}

attach(child);
// End of wrapper
