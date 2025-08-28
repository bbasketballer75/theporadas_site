#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

function compressSize(buf, algo) {
  try {
    if (algo === 'gzip') return gzipSync(buf).length;
    return brotliCompressSync(buf).length;
  } catch {
    return null;
  }
}

async function fileInfo(filePath, root) {
  const full = resolve(root, filePath);
  const st = statSync(full);
  if (!st.isFile()) return null;
  const raw = st.size;
  let content;
  try {
    content = readFileSync(full);
  } catch (_) {
    return null;
  }
  let gzip = null,
    brotli = null;
  // Only compress likely text assets
  if (/\.(js|mjs|cjs|css|html|json|txt)$/i.test(filePath)) {
    gzip = compressSize(content, 'gzip');
    brotli = compressSize(content, 'brotli');
  }
  return { path: filePath.replace(/\\/g, '/'), raw, gzip, brotli };
}

function walk(dir, base = dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

async function main() {
  const distDir = process.env.BUNDLE_DIR || 'dist';
  let distStat;
  try {
    distStat = statSync(distDir);
  } catch {
    console.error('[bundle] dist directory missing');
    process.exit(0);
  }
  if (!distStat.isDirectory()) {
    console.error('[bundle] dist path is not a directory');
    process.exit(0);
  }
  const files = walk(distDir);
  const infos = [];
  for (const f of files) {
    // Skip sourcemaps for baseline size
    if (f.endsWith('.map')) continue;
    const info = await fileInfo(f, distDir);
    if (info) infos.push(info);
  }
  // Aggregate totals (use gzip pref if available; raw always)
  const total = { raw: 0, gzip: 0, brotli: 0 };
  for (const f of infos) {
    total.raw += f.raw || 0;
    if (typeof f.gzip === 'number') total.gzip += f.gzip;
    if (typeof f.brotli === 'number') total.brotli += f.brotli;
  }
  const payload = { generatedAt: new Date().toISOString(), total, files: infos };
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/bundle-sizes.json', JSON.stringify(payload, null, 2));
  console.log('[bundle] wrote artifacts/bundle-sizes.json (files:', infos.length, ')');
}

main();
