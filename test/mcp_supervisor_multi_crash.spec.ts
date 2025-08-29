import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

interface SupEvent {
  type: string;
  event: string;
  [k: string]: unknown;
}

interface SupervisorRunResult {
  exitCode: number;
  events: SupEvent[];
}

interface ServerSummaryStats {
  spawns: number;
  restarts: number;
  exits: number;
  lastExitCode: number | null;
  ready: boolean;
  readyLatencyMs: number | null;
  totalUptimeMs: number;
  gaveUp: boolean;
}

function runSupervisor(
  args: string[],
  env: Record<string, string | undefined> = {},
): Promise<SupervisorRunResult> {
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/mcp_supervisor.mjs', ...args], {
      env: { ...process.env, DISABLE_MCP_KEEPALIVE: '1', TAVILY_FORCE_CRASH: '1', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const events: SupEvent[] = [];
    child.stdout.on('data', (d) => {
      for (const line of d.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j && j.type === 'supervisor') events.push(j);
        } catch {
          // ignore
        }
      }
    });
    child.on('close', (code) => resolve({ exitCode: code ?? -1, events }));
  });
}

describe('mcp_supervisor simultaneous immediate crashes', () => {
  it('emits single summary after multiple forced crash servers give up', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp_sup_multi_'));
    const cfgPath = path.join(dir, 'servers.json');
    fs.writeFileSync(
      cfgPath,
      JSON.stringify([
        { name: 'tavilyA', cmd: 'node', args: ['scripts/mcp_tavily.mjs'], maxRestarts: 0 },
        { name: 'tavilyB', cmd: 'node', args: ['scripts/mcp_tavily.mjs'], maxRestarts: 0 },
      ]),
    );
    const { exitCode, events } = await runSupervisor([
      '--config',
      cfgPath,
      '--max-restarts',
      '0',
      '--exit-code-on-giveup',
      '9',
      '--backoff-ms',
      '5-10',
    ]);
    const summaries = events.filter((e) => e.event === 'summary');
    expect(summaries.length).toBe(1);
    const summary = summaries[0] as SupEvent & { servers?: Record<string, ServerSummaryStats> };
    const servers = summary.servers || {};
    expect(Object.keys(servers)).toEqual(expect.arrayContaining(['tavilyA', 'tavilyB']));
    for (const k of ['tavilyA', 'tavilyB']) {
      expect(servers[k].exits).toBeGreaterThanOrEqual(1);
      expect(servers[k].restarts).toBe(0);
      expect(servers[k].gaveUp).toBe(true);
    }
    const exiting = events.find((e) => e.event === 'exiting');
    expect(exiting?.code).toBe(9);
    expect(exitCode).toBe(9);
  }, 15000);
});
