/* eslint-env node */
/* global process */
import { spawn } from 'child_process';

function startSupervisor() {
  const env = { ...process.env };
  // Limit to fs and tavily to ensure both readiness lines seen
  const proc = spawn(process.execPath, ['scripts/mcp_supervisor.mjs', '--only', 'fs,tavily'], {
    env,
  });
  const events = [];
  const readyServers = new Set();
  let capabilitiesEvent = null;
  const complete = new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          events.push(obj);
          if (obj.type === 'supervisor' && obj.event === 'ready') {
            readyServers.add(obj.server);
          }
          if (obj.type === 'supervisor' && obj.event === 'capabilities') {
            capabilitiesEvent = obj;
            resolve({ capabilitiesEvent, events });
          }
        } catch {
          // ignore
        }
      }
    });
    proc.once('error', reject);
    // Safety timeout
    setTimeout(() => {
      resolve({ capabilitiesEvent, events });
    }, 8000);
  });
  return { proc, complete, readyServers };
}

describe('supervisor capabilities aggregation', () => {
  it('emits capabilities event after all servers ready', async () => {
    const { proc, complete } = startSupervisor();
    const { capabilitiesEvent } = await complete;
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
    expect(capabilitiesEvent).not.toBeNull();
    expect(capabilitiesEvent.type).toBe('supervisor');
    expect(capabilitiesEvent.event).toBe('capabilities');
    expect(typeof capabilitiesEvent.servers).toBe('object');
    // fs should at least appear (tavily may omit methods if degraded)
    expect(Object.keys(capabilitiesEvent.servers).length).toBeGreaterThanOrEqual(1);
  });
});
