// Safe network-to-file download utility to eliminate direct raw network -> file writes.
// Features:
//  - HTTPS only
//  - Host allowlist
//  - Optional content-type allowlist
//  - Size limit (streaming, aborts if exceeded)
//  - Optional SHA256 checksum validation
//  - Path safety (must reside under provided base directory if given)
//  - Atomic write via temp file + rename
//  - Disallows redirects (prevents host bypass)
//  - Returns metadata (bytesWritten, contentType, sha256)

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_ALLOWED_HOSTS = new Set(['api.github.com']);

export async function safeDownload(url, destPath, options = {}) {
  const {
    allowedHosts = DEFAULT_ALLOWED_HOSTS,
    allowedContentTypes,
    maxBytes = 512_000,
    checksum, // expected hex SHA256
    baseDir, // if set, destPath must be within
    mode = 0o600,
  } = options;

  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('Only https protocol allowed');
  if (!allowedHosts.has(u.hostname)) throw new Error(`Host not in allowlist: ${u.hostname}`);

  // Prevent path traversal / outside writes
  const finalPath = path.resolve(destPath);
  if (baseDir) {
    const base = path.resolve(baseDir);
    if (!finalPath.startsWith(base + path.sep)) {
      throw new Error('Destination path escapes baseDir');
    }
  }

  const res = await fetch(u, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) throw new Error('Redirects blocked');
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

  const ct = res.headers.get('content-type') || '';
  if (allowedContentTypes) {
    const ok = allowedContentTypes.some((t) => ct.startsWith(t));
    if (!ok) throw new Error(`Unexpected content-type: ${ct}`);
  }

  const dir = path.dirname(finalPath);
  await fs.mkdir(dir, { recursive: true });
  const tempName = `.tmp_${path.basename(finalPath)}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
  const tempPath = path.join(dir, tempName);

  const fileHandle = await fs.open(tempPath, 'wx', mode);
  let received = 0;
  const hash = crypto.createHash('sha256');

  try {
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxBytes) {
        throw new Error('Download exceeds maxBytes');
      }
      hash.update(value);
      await fileHandle.write(value);
    }
    await fileHandle.close();

    const digest = hash.digest('hex');
    if (checksum && checksum !== digest) {
      await fs.unlink(tempPath).catch(() => {});
      throw new Error('Checksum mismatch');
    }

    await fs.rename(tempPath, finalPath);
    return { bytesWritten: received, contentType: ct, sha256: digest, path: finalPath };
  } catch (e) {
    await fileHandle.close().catch(() => {});
    await fs.unlink(tempPath).catch(() => {});
    throw e;
  }
}

export async function safeDownloadJson(url, destPath, options = {}) {
  const meta = await safeDownload(url, destPath, {
    ...options,
    allowedContentTypes: options.allowedContentTypes || ['application/json'],
  });
  const text = await fs.readFile(destPath, 'utf8');
  return { ...meta, json: JSON.parse(text) };
}
