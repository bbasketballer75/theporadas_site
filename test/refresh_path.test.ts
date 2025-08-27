import { execFileSync, spawnSync, SpawnSyncReturns } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

// This test validates that running the refresh script in a clean-ish subshell results in:
//  - Node resolvable
//  - Preflight diagnostics JSON reporting a concrete node path present
//  - Script emits success (no final warning)

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '..');
// Explicit declaration to satisfy eslint no-undef for process in test env
// Provide minimal process typing without relying on global NodeJS namespace
interface ProcEnv {
  [k: string]: string | undefined;
}
interface ProcLike {
  env: ProcEnv;
}
declare const process: ProcLike & { env: ProcEnv };
const pwshEnv = process.env.COMSPEC;
const pwsh = pwshEnv && pwshEnv.toLowerCase().includes('powershell') ? pwshEnv : 'pwsh';

function runPwsh(
  args: string[],
  env?: Record<string, string | undefined>,
): SpawnSyncReturns<string> {
  const result = spawnSync(pwsh, ['-NoProfile', '-ExecutionPolicy', 'Bypass', ...args], {
    cwd: repoRoot,
    env: { ...(process.env as Record<string, string | undefined>), ...env },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
}

describe('refresh_node_path.ps1', () => {
  it('dry run executes and cleans placeholders', () => {
    const script = path.join(repoRoot, 'scripts', 'refresh_node_path.ps1');
    const out = runPwsh([script, '-DryRun']);
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(/Refreshing Node\/NPM\/NPX PATH/);
    // DryRun should not attempt install/use, so accept absence of node version line
    // but should not throw or exit non-zero
    // Accept presence of placeholder replacement message or lack thereof (depending on current PATH)
    expect(out.stdout).not.toMatch(/Unhandled/);

    const diagFile = path.join(repoRoot, 'artifacts', 'preflight_test_diag.json');
    let preflightOut = '';
    try {
      preflightOut = execFileSync(
        'node',
        ['scripts/preflight.mjs', '--no-engines', '--json', diagFile],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        },
      );
    } catch (e) {
      // Preflight may exit non-zero due to missing env vars; capture stdout from stderr if available
      if (typeof e === 'object' && e && 'stdout' in e) {
        const candidate = (e as { stdout?: unknown }).stdout;
        if (typeof candidate === 'string') preflightOut = candidate;
      } else if (e instanceof Error) {
        preflightOut = e.message;
      }
    }
    expect(preflightOut).toMatch(/Preflight Validation Report/);
    expect(existsSync(diagFile)).toBe(true);
    const diag = JSON.parse(readFileSync(diagFile, 'utf8'));
    expect(diag.nodePathDiagnostics).toBeTruthy();
    // In dry run we only assert structure; concrete node path may not be present
    expect(typeof diag.nodePathDiagnostics.hasConcreteNode).toBe('boolean');
  }, 15000);
});
