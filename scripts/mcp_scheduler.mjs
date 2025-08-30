#!/usr/bin/env node
// In-memory scheduler MCP server. Not persistent across restarts.
// Methods:
//  sched/schedule { id?, delayMs?, cron?, payload } -> { id, eta }
//  sched/list -> { tasks:[{id, eta, cron, payload}] }
//  sched/cancel { id } -> { cancelled }
//  sched/runNow { id } -> { ran }
//  sched/stats -> { count }
// Emits task execution events by printing a JSON-RPC notification with method 'sched/event'.
// Cron supports minute-level patterns: "*/5" meaning every 5 minutes.

import './load_env.mjs';
import './mcp_logging.mjs';
import { createServer, appError } from './mcp_rpc_base.mjs';
import { randomUUID } from 'crypto';

const maxTasks = parseInt(process.env.SCHEDULER_MAX_TASKS || '500', 10);
const tasks = new Map(); // id -> { timeout, interval, cron, payload, eta }

function scheduleDelay(ms, task) {
  task.eta = Date.now() + ms;
  task.timeout = setTimeout(() => execute(task.id), ms);
}

function parseCron(expr) {
  if (!expr) return null;
  if (expr === '*') return { everyMinutes: 1 };
  // Support formats like */5 meaning every 5 minutes
  const m = expr.match(/^\*\/(\d+)$/);
  if (m) return { everyMinutes: Math.max(1, parseInt(m[1], 10)) };
  return null; // unsupported
}

function execute(id) {
  const task = tasks.get(id);
  if (!task) return;
  const payload = task.payload;
  // Emit notification-style JSON-RPC (no id) representing event
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'sched/event',
      params: { id, payload, ts: Date.now() },
    }) + '\n',
  );
  if (task.cron) {
    // naive repeating every minute pattern
    task.eta = Date.now() + 60_000;
    task.timeout = setTimeout(() => execute(id), 60_000);
  } else if (!task.interval) {
    tasks.delete(id);
  }
}

createServer(({ register }) => {
  register('sched/schedule', (p = {}) => {
    if (tasks.size >= maxTasks)
      throw appError(2400, 'capacity reached', { domain: 'scheduler', symbol: 'E_CAP' });
    const id = p.id || randomUUID();
    if (tasks.has(id))
      throw appError(2401, 'duplicate id', { domain: 'scheduler', symbol: 'E_DUP' });
    const delayMs = parseInt(p.delayMs || '0', 10);
    const task = { id, payload: p.payload, cron: null, eta: null, timeout: null };
    tasks.set(id, task);
    scheduleDelay(Math.max(0, delayMs), task);
    return { id, eta: task.eta };
  });
  register('sched/list', () => ({
    tasks: Array.from(tasks.values()).map((t) => ({
      id: t.id,
      eta: t.eta,
      cron: t.cron,
      payload: t.payload,
    })),
  }));
  register('sched/cancel', (p = {}) => {
    if (!p.id) throw appError(2402, 'id required', { domain: 'scheduler', symbol: 'E_PARAMS' });
    const task = tasks.get(p.id);
    if (!task) return { cancelled: false };
    clearTimeout(task.timeout);
    tasks.delete(p.id);
    return { cancelled: true };
  });
  register('sched/runNow', (p = {}) => {
    if (!p.id) throw appError(2402, 'id required', { domain: 'scheduler', symbol: 'E_PARAMS' });
    execute(p.id);
    return { ran: true };
  });
  register('sched/stats', () => ({ count: tasks.size }));
});
