#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import { config } from 'dotenv';

config();

function log(obj) {
  try {
    process.stdout.write(JSON.stringify({ type: 'supervisor', ...obj }) + '\n');
  } catch {
    // Swallow logging/serialization errors to avoid noisy stderr
    /* noop */
  }
}

const args = process.argv.slice(2);
let only = null;
let cfgPath = null;
let maxRestarts = 0;
let exitOnGiveUp = 0;
let backoffMin = 5;
let backoffMax = 10;
let maxUptimeMs = null;
let logFile = null;

let i = 0;
while (i < args.length) {
  const a = args[i];
  if (a === '--only') {
    only = args[i + 1] || null;
    i += 2; // Skip current and next arg
  } else if (a === '--config') {
    cfgPath = args[i + 1] || null;
    i += 2; // Skip current and next arg
  } else if (a === '--max-restarts') {
    maxRestarts = Number(args[i + 1] || '0');
    i += 2; // Skip current and next arg
  } else if (a === '--exit-code-on-giveup') {
    exitOnGiveUp = Number(args[i + 1] || '0');
    i += 2; // Skip current and next arg
  } else if (a === '--backoff-ms') {
    const v = (args[i + 1] || '5-10').split('-');
    backoffMin = Number(v[0]);
    backoffMax = Number(v[1] || v[0]);
    i += 2; // Skip current and next arg
  } else if (a === '--max-uptime-ms') {
    maxUptimeMs = Number(args[i + 1] || '0');
    i += 2; // Skip current and next arg
  } else if (a === '--log-file') {
    logFile = args[i + 1] || null;
    i += 2; // Skip current and next arg
  } else {
    i++; // Move to next arg
  }
}

const base = [
  { name: 'fs', cmd: process.execPath, args: [resolve('scripts/mcp_filesystem.mjs')] },
  { name: 'tavily', cmd: process.execPath, args: [resolve('scripts/mcp_tavily.mjs')] },
];

if (process.env.MCP_INCLUDE_SSE === '1') {
  base.push({ name: 'sse', cmd: process.execPath, args: [resolve('scripts/mcp_sse_gateway.mjs')] });
}

let servers = base;
if (cfgPath) {
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    servers = cfg.map((s) => ({
      name: s.name,
      cmd: s.cmd,
      args: s.args,
      maxRestarts: s.maxRestarts,
    }));
  } catch {
    log({ event: 'config-parse-error', path: cfgPath });
  }
}
if (only) {
  const allow = new Set(only.split(',').map((s) => s.trim()));
  servers = servers.filter((s) => allow.has(s.name));
}

const state = new Map();
let readyCount = 0;
let gaveUpCount = 0;
let exitCode = 0;

function parseServerOutput(line, st, s, startAt) {
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'ready' || obj.method === 'fs/ready') {
      if (!st.ready) {
        st.ready = true;
        st.readyLatencyMs = Date.now() - startAt;
        readyCount++;
        log({ event: 'ready', server: s.name });
        if (readyCount === servers.length) {
          const caps = {};
          for (const sv of servers) caps[sv.name] = { methods: ['placeholder'] };
          log({ event: 'capabilities', servers: caps });
        }
      }
    }
  } catch {
    // ignore non-JSON
  }
}

function processServerLines(buf, st, s, startAt) {
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    parseServerOutput(line, st, s, startAt);
  }
  return buf;
}

function randBackoff() {
  return Math.max(
    backoffMin,
    Math.floor(Math.random() * (backoffMax - backoffMin + 1)) + backoffMin,
  );
}

function startServer(s) {
  const st = state.get(s.name) || {
    spawns: 0,
    restarts: 0,
    exits: 0,
    lastExitCode: null,
    ready: false,
    readyLatencyMs: null,
    totalUptimeMs: 0,
    gaveUp: false,
    child: null,
    deadlineAt: null,
    maxUptimeReached: false,
  };
  if (maxUptimeMs && !st.deadlineAt) {
    st.deadlineAt = Date.now() + maxUptimeMs;
    const remaining = Math.max(0, st.deadlineAt - Date.now());
    setTimeout(() => {
      if (st.maxUptimeReached) return;
      st.maxUptimeReached = true;
      log({ event: 'max-uptime-reached', server: s.name });
      try {
        if (st.child) st.child.kill();
      } catch {
        /* ignore */
      }
    }, remaining);
  }
  const startAt = Date.now();
  const child = spawn(s.cmd, s.args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  st.spawns++;
  st.child = child;
  state.set(s.name, st);
  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d.toString();
    buf = processServerLines(buf, st, s, startAt);
  });
  child.on('close', (code) => {
    st.child = null;
    st.exits++;
    st.totalUptimeMs += Date.now() - startAt;
    st.lastExitCode = code;
    const allowed = s.maxRestarts ?? maxRestarts;
    if (!st.maxUptimeReached && st.restarts < allowed) {
      st.restarts++;
      log({ event: 'restart-scheduled', server: s.name, delayMs: randBackoff() });
      setTimeout(() => startServer(s), randBackoff());
    } else {
      st.gaveUp = true;
      gaveUpCount++;
      if (gaveUpCount === servers.length) maybeFinish();
    }
  });
}

function finish() {
  const summary = {};
  for (const [name, st] of state) summary[name] = st;
  log({ event: 'summary', servers: summary });
  exitCode = exitOnGiveUp || 0;
  log({ event: 'exiting', code: exitCode });
  if (logFile) {
    try {
      writeFileSync(
        logFile,
        JSON.stringify({ type: 'supervisor', event: 'summary', servers: summary }) + '\n',
      );
    } catch {
      /* ignore */
    }
  }
  process.exit(exitCode);
}

function emitMaxUptimeEvents() {
  for (const s of servers) {
    const st = state.get(s.name);
    if (st && !st.maxUptimeReached) {
      st.maxUptimeReached = true;
      log({ event: 'max-uptime-reached', server: s.name });
    }
  }
}

function calculateMaxRemainingTime() {
  const now = Date.now();
  let maxRemaining = 0;
  for (const s of servers) {
    const st = state.get(s.name);
    if (!st || st.maxUptimeReached) continue;
    if (st.deadlineAt && st.deadlineAt > now) {
      maxRemaining = Math.max(maxRemaining, st.deadlineAt - now);
    }
  }
  return maxRemaining;
}

function maybeFinish() {
  if (!maxUptimeMs) return finish();

  const maxRemaining = calculateMaxRemainingTime();
  if (maxRemaining <= 0) {
    emitMaxUptimeEvents();
    return finish();
  }

  setTimeout(() => {
    emitMaxUptimeEvents();
    finish();
  }, maxRemaining);
}

for (const s of servers) startServer(s);
