import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { safeDownload } from '../scripts/lib/safe_download.mjs';

let server;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok.json') {
        const body = JSON.stringify({ ok: true });
        res.setHeader('Content-Type', 'application/json');
        res.end(body);
      } else if (req.url === '/large.bin') {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.writeHead(200);
        res.end(Buffer.alloc(20_000, 1));
      } else if (req.url === '/redir') {
        res.writeHead(302, { Location: '/ok.json' });
        res.end();
      } else {
        res.statusCode = 404;
        res.end('nf');
      }
    });
    server.listen(0, resolve);
  });
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`; // note: http (will trigger protocol error)
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('safeDownload', () => {
  it('rejects non-https', async () => {
    await expect(
      safeDownload(`${baseUrl}/ok.json`, path.join(process.cwd(), 'artifacts', 'tmp_ok.json')),
    ).rejects.toThrow(/https/);
  });

  it('downloads allowed host (simulate by overriding allowlist and using https://api.github.com)', async () => {
    // Use a small GitHub API endpoint with low size
    const dest = path.join(process.cwd(), 'artifacts', 'gh_meta.json');
    const meta = await safeDownload('https://api.github.com/', dest, {
      allowedHosts: new Set(['api.github.com']),
      allowedContentTypes: ['application/json'],
      maxBytes: 200_000,
    });
    expect(meta.bytesWritten).toBeGreaterThan(0);
    const content = await fs.readFile(dest, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('enforces content-type', async () => {
    // We'll hit api.github.com (JSON) but require text/plain to force failure
    const dest = path.join(process.cwd(), 'artifacts', 'gh_meta_fail.json');
    await expect(
      safeDownload('https://api.github.com/', dest, {
        allowedHosts: new Set(['api.github.com']),
        allowedContentTypes: ['text/plain'],
      }),
    ).rejects.toThrow(/content-type/);
  });

  it('enforces size limit', async () => {
    const dest = path.join(process.cwd(), 'artifacts', 'gh_meta_small.json');
    await expect(
      safeDownload('https://api.github.com/', dest, {
        allowedHosts: new Set(['api.github.com']),
        maxBytes: 10, // extremely small
      }),
    ).rejects.toThrow(/maxBytes/);
  });

  it('checksum mismatch rejected', async () => {
    const dest = path.join(process.cwd(), 'artifacts', 'gh_meta_checksum.json');
    await expect(
      safeDownload('https://api.github.com/', dest, {
        allowedHosts: new Set(['api.github.com']),
        checksum: 'deadbeef',
      }),
    ).rejects.toThrow(/Checksum/);
  });
});
