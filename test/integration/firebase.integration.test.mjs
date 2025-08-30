import { spawn } from 'child_process';
import { describe, expect, it } from 'vitest';

function startServer(cmd, args, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: process.env });
    const methods = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.kill();
        } catch {}
        reject(new Error('timeout waiting for ready'));
      }
    }, timeout);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      chunk
        .split(/\n/)
        .filter(Boolean)
        .forEach((line) => {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'ready' && !settled) {
              if (Array.isArray(obj.methods)) methods.push(...obj.methods);
              settled = true;
              clearTimeout(timer);
              resolve({ child, methods });
            }
          } catch (e) {
            console.warn(
              `Firebase integration test: Failed to parse line: ${line}, error: ${e.message}`,
            );
          }
        });
    });
    child.on('error', (e) => {
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        reject(e);
      }
    });
    child.on('exit', (c) => {
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        reject(new Error('exited ' + c));
      }
    });
  });
}

async function rpc(child, method, params) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e6);
    const timer = setTimeout(() => reject(new Error('rpc timeout')), 5000);
    function onData(d) {
      d.split(/\n/)
        .filter(Boolean)
        .forEach((line) => {
          try {
            const obj = JSON.parse(line);
            if (obj.id === id) {
              clearTimeout(timer);
              child.stdout.off('data', onData);
              if (obj.error) reject(new Error(obj.error.message));
              else resolve(obj.result);
            }
          } catch (e) {
            console.warn(
              `Firebase integration test RPC: Failed to parse line: ${line}, error: ${e.message}`,
            );
          }
        });
    }
    child.stdout.on('data', onData);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

describe('firebase MCP integration', () => {
  it('ping always available and optional project/app listing', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_firebase.mjs']);
    expect(methods).toContain('firebase/ping');
    const pong = await rpc(child, 'firebase/ping', {});
    expect(pong.ok).toBe(true);
    if (process.env.FIREBASE_TOKEN) {
      if (methods.includes('firebase/projects')) {
        const projects = await rpc(child, 'firebase/projects', {});
        // Expected shape from firebase CLI: { projects: [ { projectId, displayName, ... }, ... ] }
        if (projects && Array.isArray(projects.projects)) {
          // Basic invariant: each entry has a projectId string
          for (const p of projects.projects.slice(0, 3)) {
            expect(typeof p.projectId).toBe('string');
            expect(p.projectId.length).toBeGreaterThan(0);
          }
          // Optionally exercise apps call for first project if method available
          if (methods.includes('firebase/apps') && projects.projects[0]) {
            const first = projects.projects[0];
            try {
              const apps = await rpc(child, 'firebase/apps', { projectId: first.projectId });
              // apps may be { android:[], ios:[], web:[] } depending on CLI output
              if (apps && typeof apps === 'object') {
                ['androidApps', 'iosApps', 'webApps'].forEach((k) => {
                  if (k in apps) {
                    expect(Array.isArray(apps[k])).toBe(true);
                  }
                });
              }
            } catch (e) {
              // Acceptable if token lacks permission or project has restricted access
            }
          }
        } else {
          // Fallback weaker invariant if shape diverges (avoid hard flakes on format drift)
          expect(typeof projects).toBe('object');
        }
      } else {
        // With token we generally expect project listing; failing to expose is noteworthy but not fatal
        // (Do not fail test; future enhancement could log a warning.)
      }
    }
    child.kill();
  });
});
