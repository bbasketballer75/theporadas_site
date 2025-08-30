#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import './mcp_logging.mjs';

/*
  Simple MCP supervisor: spawns selected MCP stub servers and reports readiness.
  Servers: filesystem, tavily (extensible via CLI flags later).
  Each child should emit a one-time JSON readiness line or remain silent (we treat silence as best-effort).
*/

const baseServers = [
  { name: 'fs', cmd: 'node', args: ['scripts/mcp_filesystem.mjs'] },
  { name: 'tavily', cmd: 'node', args: ['scripts/mcp_tavily.mjs'] },
];

if (process.env.MCP_INCLUDE_SSE === '1' || process.argv.includes('--with-sse')) {
  baseServers.push({ name: 'sse', cmd: 'node', args: ['scripts/mcp_sse_gateway.mjs'] });
}

// Parse CLI flags: --only a,b   --exclude x,y  --max-restarts N  --backoff-ms 500-5000  --fail-fast
// Optional: --heartbeat-ms N (emit periodic heartbeat)  --config path/to/servers.json
// New (pending features): --exit-code-on-giveup N  --log-file path/to/log.jsonl  --max-uptime-ms N
const argv = process.argv.slice(2);
function listArg(flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  return (
    argv[i + 1]
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || null
  );
}
function numArg(flag, def) {
  const i = argv.indexOf(flag);
  if (i === -1) return def;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) ? v : def;
}

const only = listArg('--only');
const exclude = listArg('--exclude') || [];
const maxRestarts = numArg('--max-restarts', 3);
const failFast = argv.includes('--fail-fast');
const heartbeatMs = numArg('--heartbeat-ms', 0);
const configIdx = argv.indexOf('--config');
const configPath = configIdx !== -1 ? argv[configIdx + 1] : null;
const backoffSpec = argv.includes('--backoff-ms')
  ? argv[argv.indexOf('--backoff-ms') + 1]
  : '500-4000';
const exitCodeOnGiveUp = numArg('--exit-code-on-giveup', null);
const logFileIdx = argv.indexOf('--log-file');
const logFilePath = logFileIdx !== -1 ? argv[logFileIdx + 1] : null;
const maxUptimeMs = numArg('--max-uptime-ms', 0);
let minBackoff = 500,
  maxBackoff = 4000;
if (backoffSpec && backoffSpec.includes('-')) {
  const [a, b] = backoffSpec.split('-').map(Number);
  if (Number.isFinite(a) && Number.isFinite(b) && a <= b) {
    minBackoff = a;
    maxBackoff = b;
  }
}

// Prepare log file stream early so logJson can use it even during config load
let logFileStream = null;
if (logFilePath) {
  try {
    const fs = await import('node:fs');
    logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  } catch {
    process.stderr.write(`[supervisor][err] Failed to open log file ${logFilePath}\n`);
  }
}

let dynamicServers = baseServers;
if (configPath) {
  try {
    const fs = await import('node:fs');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      dynamicServers = parsed
        .filter((s) => s && s.name && s.cmd)
        .map((s) => ({
          name: s.name,
          cmd: s.cmd,
          args: Array.isArray(s.args) ? s.args : [],
          maxRestarts: Number.isFinite(s.maxRestarts) ? s.maxRestarts : undefined,
        }));
      logJson({
        type: 'supervisor',
        event: 'config-loaded',
        servers: dynamicServers.map((s) => s.name),
      });
    } else {
      logJson({ type: 'supervisor', event: 'config-invalid', reason: 'Root JSON not array' });
    }
  } catch {
    logJson({ type: 'supervisor', event: 'config-error', message: 'Failed to load config' });
  }
}

const servers = dynamicServers
  .filter((s) => !only || only.includes(s.name))
  .filter((s) => !exclude.includes(s.name))
  .map((s) => ({ ...s, restarts: 0, spawns: 0, exits: 0, gaveUp: false }));

const processes = new Map();

const state = {
  startTime: Date.now(),
  servers: {}, // name -> stats
  failFastEnabled: failFast,
  failFastTriggered: false,
  failFastServer: null,
  summaryEmitted: false,
};

for (const s of servers) {
  state.servers[s.name] = {
    spawns: 0,
    restarts: 0,
    exits: 0,
    lastExitCode: null,
    ready: false,
    firstSpawn: null,
    readyAt: null,
    lastExitAt: null,
    totalUptimeMs: 0,
    gaveUp: false,
  };
}

function randBackoff() {
  return Math.floor(minBackoff + Math.random() * (maxBackoff - minBackoff));
}

function logJson(obj) {
  const line = JSON.stringify(obj) + '\n';
  process.stdout.write(line);
  if (logFileStream) {
    logFileStream.write(line);
  }
}

function spawnOne(s) {
  const stats = state.servers[s.name];
  const child = spawn(s.cmd, s.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MCP_SERVER_NAME: s.name },
  });
  const meta = { child, ready: false, startedAt: Date.now(), running: true };
  processes.set(s.name, meta);
  s.spawns++;
  stats.spawns++;
  if (!stats.firstSpawn) stats.firstSpawn = meta.startedAt;
  child.stdout.on('data', (d) => {
    const text = d.toString();
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j && j.type === 'ready' && j.server) {
          meta.ready = true;
          stats.ready = true;
          if (!stats.readyAt) stats.readyAt = Date.now();
          logJson({ type: 'supervisor', event: 'ready', server: s.name, pid: child.pid });
          // Capture capabilities (methods) if provided by child readiness line
          if (Array.isArray(j.methods)) {
            stats.methods = j.methods.slice();
          }
          maybeEmitCapabilities();
        }
      } catch {
        console.warn(`[supervisor] Failed to parse JSON from ${s.name}`);
      }
    }
    process.stdout.write(`[${s.name}] ${text}`);
  });
  child.stderr.on('data', (d) => {
    process.stderr.write(`[${s.name}][err] ${d}`);
  });
  child.on('exit', (code) => {
    const end = Date.now();
    meta.running = false;
    stats.lastExitCode = code;
    stats.exits++;
    stats.lastExitAt = end;
    if (meta.startedAt) stats.totalUptimeMs += end - meta.startedAt;
    logJson({ type: 'supervisor', event: 'exit', server: s.name, code, restarts: s.restarts });
    const serverMax = Number.isFinite(s.maxRestarts) ? s.maxRestarts : maxRestarts;
    if (code !== 0 && s.restarts < serverMax) {
      s.restarts++;
      stats.restarts = s.restarts;
      const delay = randBackoff();
      logJson({
        type: 'supervisor',
        event: 'restart-scheduled',
        server: s.name,
        inMs: delay,
        attempt: s.restarts,
        serverMaxRestarts: serverMax,
      });
      setTimeout(() => spawnOne(s), delay);
    } else if (code !== 0) {
      s.gaveUp = true;
      stats.gaveUp = true;
      logJson({ type: 'supervisor', event: 'give-up', server: s.name });
      if (failFast) triggerFailFast(s.name);
      else checkAllExited();
    } else {
      // Normal zero exit
      checkAllExited();
    }
  });
  logJson({ type: 'supervisor', event: 'spawn', server: s.name, pid: child.pid });
}

function triggerFailFast(server) {
  if (state.failFastTriggered) return;
  state.failFastTriggered = true;
  state.failFastServer = server;
  logJson({ type: 'supervisor', event: 'fail-fast-triggered', server });
  shutdown();
}

function checkAllExited() {
  // Natural completion when all meta.running flags are false and no restarts pending
  for (const [, meta] of processes) {
    if (meta.running) return;
  }
  shutdown();
}

function supervise() {
  if (!servers.length) {
    logJson({ type: 'supervisor', event: 'no-servers' });
    return;
  }
  for (const s of servers) spawnOne(s);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  logJson({
    type: 'supervisor',
    event: 'started',
    servers: servers.map((s) => s.name),
    failFast,
    heartbeatMs,
    exitCodeOnGiveUp,
    maxUptimeMs,
    logFilePath: !!logFilePath,
  });
  if (heartbeatMs > 0) scheduleHeartbeat();
  if (maxUptimeMs > 0) scheduleMaxUptime();
}

function maybeEmitCapabilities() {
  // Only emit once, after every server that will become ready has become ready
  if (state.capabilitiesEmitted) return;
  const allReady = servers.every((s) => state.servers[s.name].ready);
  if (!allReady) return;
  const serversCaps = {};
  for (const [name, stats] of Object.entries(state.servers)) {
    if (Array.isArray(stats.methods)) serversCaps[name] = stats.methods;
  }
  state.capabilitiesEmitted = true;
  logJson({ type: 'supervisor', event: 'capabilities', servers: serversCaps });
}

function scheduleHeartbeat() {
  if (heartbeatMs <= 0) return;
  if (shuttingDown) return;
  const snapshot = {};
  for (const [name, stats] of Object.entries(state.servers)) {
    snapshot[name] = {
      spawns: stats.spawns,
      restarts: stats.restarts,
      exits: stats.exits,
      ready: stats.ready,
      gaveUp: stats.gaveUp,
      lastExitCode: stats.lastExitCode,
    };
  }
  logJson({ type: 'supervisor', event: 'heartbeat', timestamp: Date.now(), servers: snapshot });
  setTimeout(scheduleHeartbeat, heartbeatMs);
}

function emitSummary() {
  if (state.summaryEmitted) return;
  state.summaryEmitted = true;
  const endTime = Date.now();
  const durationMs = endTime - state.startTime;
  const serversSummary = {};
  for (const [name, stats] of Object.entries(state.servers)) {
    const readyLatencyMs =
      stats.readyAt && stats.firstSpawn ? stats.readyAt - stats.firstSpawn : null;
    serversSummary[name] = {
      spawns: stats.spawns,
      restarts: stats.restarts,
      exits: stats.exits,
      lastExitCode: stats.lastExitCode,
      ready: stats.ready,
      readyLatencyMs,
      totalUptimeMs: stats.totalUptimeMs,
      gaveUp: stats.gaveUp,
    };
  }
  logJson({
    type: 'supervisor',
    event: 'summary',
    startTime: state.startTime,
    endTime,
    durationMs,
    failFastEnabled: state.failFastEnabled,
    failFastTriggered: state.failFastTriggered,
    failFastServer: state.failFastServer,
    servers: serversSummary,
  });
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  logJson({ type: 'supervisor', event: 'shutdown' });
  for (const [, meta] of processes) {
    try {
      meta.child.kill('SIGTERM');
    } catch {
      console.warn(`[supervisor] Failed to kill child process`);
    }
  }
  // Allow short grace period then emit summary & exit
  setTimeout(() => {
    emitSummary();
    let code = state.failFastTriggered ? 1 : 0;
    if (!state.failFastTriggered && exitCodeOnGiveUp != null) {
      const anyGiveUp = Object.values(state.servers).some(
        (s) => s.gaveUp || (s.lastExitCode && s.lastExitCode !== 0 && maxRestarts === 0),
      );
      if (anyGiveUp) code = exitCodeOnGiveUp;
    }
    logJson({ type: 'supervisor', event: 'exiting', code });
    if (logFileStream) {
      try {
        logFileStream.end();
      } catch {
        console.warn(`[supervisor] Failed to close log file stream`);
      }
    }
    process.exit(code);
  }, 250);
}

function scheduleMaxUptime() {
  const remaining = state.startTime + maxUptimeMs - Date.now();
  if (remaining <= 0) {
    logJson({ type: 'supervisor', event: 'max-uptime-reached', maxUptimeMs });
    shutdown();
    return;
  }
  setTimeout(() => {
    logJson({ type: 'supervisor', event: 'max-uptime-reached', maxUptimeMs });
    shutdown();
  }, remaining);
}

supervise();
