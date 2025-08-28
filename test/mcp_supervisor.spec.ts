import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

interface SupEvent {
  type: string;
  event: string;
  [k: string]: unknown;
}

function runSupervisor(
  args: string[],
  env: Record<string, string | undefined> = {},
): Promise<{ exitCode: number; events: SupEvent[] }> {
  return new Promise((resolve) => {
    const baseEnv = process.env;
    const child = spawn('node', ['scripts/mcp_supervisor.mjs', ...args], {
      env: { ...baseEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const events: SupEvent[] = [];
    child.stdout.on('data', (d) => {
      const lines = d.toString().split(/\r?\n/);
      for (const line of lines) {
        if (!line || !line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j && j.type === 'supervisor') {
            events.push(j as SupEvent);
          }
        } catch {
          // ignore non-JSON lines
        }
      }
    });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? -1, events });
    });
  });
}

describe('mcp_supervisor basic behaviors', () => {
  it('applies exit-code-on-giveup when a server gives up', async () => {
    const { exitCode, events } = await runSupervisor([
      '--only',
      'tavily',
      '--max-restarts',
      '0',
      '--exit-code-on-giveup',
      '7',
      '--backoff-ms',
      '5-10',
    ]);
    const exiting = events.find((e) => e.event === 'exiting');
    expect(exiting?.code).toBe(7);
    expect(exitCode).toBe(7);
  });

  it('writes log file when specified', async () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'mcp_sup_'));
    const logPath = join(tmpBase, 'supervisor.log');
    const { events } = await runSupervisor([
      '--only',
      'tavily',
      '--max-restarts',
      '0',
      '--exit-code-on-giveup',
      '5',
      '--log-file',
      logPath,
    ]);
    const exiting = events.find((e) => e.event === 'exiting');
    expect(exiting?.code).toBe(5);
    const file = readFileSync(logPath, 'utf8');
    expect(file).toContain('"event":"summary"');
  });

  it('honors per-server maxRestarts override from config', async () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'mcp_cfg_'));
    const cfgPath = join(tmpBase, 'servers.json');
    writeFileSync(
      cfgPath,
      JSON.stringify([
        { name: 'tavily', cmd: 'node', args: ['scripts/mcp_tavily.mjs'], maxRestarts: 1 },
      ]),
    );
    const { events } = await runSupervisor([
      '--config',
      cfgPath,
      '--max-restarts',
      '0',
      '--exit-code-on-giveup',
      '3',
      '--backoff-ms',
      '5-10',
    ]);
    const restartEvents = events.filter((e) => e.event === 'restart-scheduled');
    expect(restartEvents.length).toBe(1); // override allowed one restart
  });

  it('emits max-uptime-reached when max-uptime-ms exceeded', async () => {
    const { events } = await runSupervisor([
      '--only',
      'tavily',
      '--max-restarts',
      '1',
      '--max-uptime-ms',
      '120',
      '--backoff-ms',
      '10-20',
    ]);
    expect(events.some((e) => e.event === 'max-uptime-reached')).toBe(true);
  });
});
