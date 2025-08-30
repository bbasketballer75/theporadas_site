#!/usr/bin/env node
// Simple smoke tests for MCP servers. Skips if dependency missing or error.
import { spawn } from 'child_process';

const tests = [
  {
    name: 'memoryBank list',
    cmd: ['node', ['scripts/mcp_memory_bank.mjs']],
    request: { jsonrpc: '2.0', id: 1, method: 'mb/list' },
    expectKey: 'files',
  },
  {
    name: 'kg add/query',
    sequence: [
      {
        request: {
          jsonrpc: '2.0',
          id: 1,
          method: 'kg/add',
          params: { subject: 'Test', predicate: 'has', object: 'KG' },
        },
      },
      {
        request: { jsonrpc: '2.0', id: 2, method: 'kg/query', params: { subject: 'Test' } },
        expectKey: 'triples',
      },
    ],
    cmd: ['node', ['scripts/mcp_kg_memory.mjs']],
  },
  {
    name: 'python exec',
    cmd: ['node', ['scripts/mcp_python.mjs']],
    request: { jsonrpc: '2.0', id: 1, method: 'py/exec', params: { code: 'print(3*7)' } },
    expectKey: 'stdout',
  },
  {
    name: 'playwright launch (optional)',
    cmd: ['node', ['scripts/mcp_playwright.mjs']],
    request: { jsonrpc: '2.0', id: 1, method: 'pw/list' },
    expectKey: 'sessions',
    optional: true,
  },
  {
    name: 'puppeteer launch (optional)',
    cmd: ['node', ['scripts/mcp_puppeteer.mjs']],
    request: { jsonrpc: '2.0', id: 1, method: 'pt/list' },
    expectKey: 'sessions',
    optional: true,
  },
  {
    name: 'github repo (optional)',
    cmd: ['node', ['scripts/mcp_github.mjs']],
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'gh/repo',
      params: { owner: 'octocat', repo: 'Hello-World' },
    },
    expectKey: 'repo',
    optional: true,
  },
];

function runTest(def) {
  return new Promise((resolve) => {
    const [command, args] = def.cmd;
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = [];
    let sent = false;
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => {
      d.split(/\n/).forEach((l) => l.trim() && lines.push(l.trim()));
      if (!sent && lines.some((l) => /ready"?/.test(l))) {
        sent = true;
        try {
          if (def.sequence) {
            def.sequence.forEach((s) => proc.stdin.write(JSON.stringify(s.request) + '\n'));
          } else if (def.request) {
            proc.stdin.write(JSON.stringify(def.request) + '\n');
          }
        } catch (error) {
          console.warn(`[smoke-test] Failed to send request to ${def.name}: ${error.message}`);
        }
        setTimeout(() => {
          try {
            proc.kill();
          } catch (error) {
            console.warn(`[smoke-test] Failed to kill process for ${def.name}: ${error.message}`);
          }
        }, 400);
      }
    });
    proc.on('close', () => {
      let passed = false;
      try {
        const responses = lines
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch (error) {
              console.warn(
                `[smoke-test] Failed to parse JSON line from ${def.name}: ${error.message}`,
              );
              return null;
            }
          })
          .filter(Boolean);
        if (def.sequence) {
          const last = responses.find((r) => r.id === def.sequence.at(-1).request.id);
          passed =
            !!last?.result && def.sequence.at(-1).expectKey
              ? last.result[def.sequence.at(-1).expectKey] !== undefined
              : true;
        } else {
          const resp = responses.find((r) => r.id === def.request.id);
          passed =
            !!resp?.result && (def.expectKey ? resp.result[def.expectKey] !== undefined : true);
        }
      } catch (error) {
        console.warn(`[smoke-test] Failed to evaluate test ${def.name}: ${error.message}`);
        passed = false;
      }
      resolve({ name: def.name, passed, optional: def.optional });
    });
    proc.stderr.on('data', () => {});
  });
}

(async () => {
  const results = [];
  for (const t of tests) {
    const r = await runTest(t);
    results.push(r);
  }
  const failed = results.filter((r) => !r.passed && !r.optional);
  console.log(JSON.stringify({ results, failed: failed.length }));
  process.exit(failed.length ? 1 : 0);
})();
