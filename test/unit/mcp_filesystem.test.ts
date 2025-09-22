import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'fs';
import process from 'node:process';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message: string };
}

interface ReadyMessage extends JsonRpcMessage {
  method: 'fs/ready';
  params: { root: string };
}

interface ListResult {
  items: string[];
}
interface ReadResult {
  path: string;
  content: string;
}
interface WriteResult {
  path: string;
  written: boolean;
}

function rpc(serverPath: string, root: string) {
  const child: ChildProcessWithoutNullStreams = spawn('node', [serverPath], {
    env: { ...process.env, MCP_FS_ROOT: root },
  });
  let stdout = '';
  child.stdout.on('data', (d) => {
    stdout += d.toString();
  });
  function send(msg: unknown) {
    child.stdin.write(JSON.stringify(msg) + '\n');
  }
  function nextMessage<T = JsonRpcMessage>(predicate?: (o: JsonRpcMessage) => boolean): Promise<T> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const obj: JsonRpcMessage = JSON.parse(line);
            if (!predicate || predicate(obj)) {
              clearInterval(interval);
              return resolve(obj as T);
            }
          } catch {
            // ignore parse errors
          }
        }
        if (Date.now() - start > 3000) {
          clearInterval(interval);
          (reject as (reason?: unknown) => void)(new Error('Timeout waiting for message'));
        }
      }, 25);
    });
  }
  return { send, nextMessage, child };
}

describe('filesystem JSON-RPC server', () => {
  it('announces ready and handles list/read/write', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'fs-mcp-'));
    const seedPath = join(tempRoot, 'seed.txt');
    writeFileSync(seedPath, 'hello');
    const serverPath = join(process.cwd(), 'scripts', 'mcp_filesystem.mjs');
    const client = rpc(serverPath, tempRoot);

    const ready = await client.nextMessage<ReadyMessage>((o) => o.method === 'fs/ready');
    expect(ready.params.root).toBeDefined();

    client.send({ jsonrpc: '2.0', id: 1, method: 'fs/list', params: { dir: '.' } });
    const listResp = await client.nextMessage<{ id: number; result: ListResult }>(
      (o) => o.id === 1,
    );
    expect(Array.isArray(listResp.result.items)).toBe(true);

    client.send({ jsonrpc: '2.0', id: 2, method: 'fs/read', params: { path: 'seed.txt' } });
    const readResp = await client.nextMessage<{ id: number; result: ReadResult }>(
      (o) => o.id === 2,
    );
    expect(readResp.result.content).toBe('hello');

    client.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'fs/write',
      params: { path: 'out.txt', content: 'data' },
    });
    const writeResp = await client.nextMessage<{ id: number; result: WriteResult }>(
      (o) => o.id === 3,
    );
    expect(writeResp.result.written).toBe(true);
    expect(readFileSync(join(tempRoot, 'out.txt'), 'utf8')).toBe('data');

    client.child.kill();
  });
});
