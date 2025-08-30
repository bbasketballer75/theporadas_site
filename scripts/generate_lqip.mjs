#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

import { Jimp } from 'jimp';

/*
 * generate_lqip.mjs
 * Scans media/encoded for images and writes low-quality placeholders to media/lqip.
 * Only processes files that do not already have a corresponding lqip file.
 * Usage: npm run lqip [-- --force]
 */

const ENCODED_DIR = path.resolve('media/encoded');
const LQIP_DIR = path.resolve('media/lqip');
const FORCE = process.argv.includes('--force');
const CHECK = process.argv.includes('--check');
const TARGET_WIDTH = 32; // very small for placeholder

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function lqipName(file) {
  return file; // maintain same filename; directory differs
}

async function buildList() {
  const entries = await fs.readdir(ENCODED_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name));
}

async function needProcess(file) {
  if (FORCE) return true;
  try {
    await fs.access(path.join(LQIP_DIR, lqipName(file)));
    return false; // already exists
  } catch (error) {
    console.warn(`[lqip] File access check failed for ${file}: ${error.message}`);
    return true;
  }
}

async function generateOne(file) {
  const srcPath = path.join(ENCODED_DIR, file);
  const outPath = path.join(LQIP_DIR, lqipName(file));
  const img = await Jimp.read(srcPath);
  const ratio = TARGET_WIDTH / img.width;
  const height = Math.max(1, Math.round(img.height * ratio));
  img.resize({ width: TARGET_WIDTH });
  // slight blur to reduce detail & bytes
  if (img.blur) img.blur(1);
  if (/\.jpe?g$/i.test(file)) {
    img.quality(40);
  }
  await img.write(outPath);
  return { file, width: TARGET_WIDTH, height };
}

async function main() {
  await ensureDir(LQIP_DIR);
  const files = await buildList();
  const toProcess = [];
  for (const f of files) {
    if (await needProcess(f)) toProcess.push(f);
  }
  if (!toProcess.length) {
    if (CHECK) {
      console.log('[lqip] CHECK: all placeholders present.');
      return;
    }
    console.log('[lqip] All placeholders already present. Use --force to regenerate.');
    return;
  }
  if (CHECK) {
    console.error('[lqip] CHECK FAILED: missing placeholders for files:', toProcess.join(', '));
    process.exit(1);
  }
  console.log(`[lqip] Generating ${toProcess.length} placeholders...`);
  let ok = 0;
  for (const file of toProcess) {
    try {
      const meta = await generateOne(file);
      ok++;
      console.log(`[lqip] ✓ ${file} -> ${meta.width}x${meta.height}`);
    } catch (err) {
      console.error(`[lqip] ✗ ${file}:`, err.message || err);
    }
  }
  console.log(`[lqip] Done. Generated ${ok}/${toProcess.length}.`);
}

main().catch((err) => {
  console.error('[lqip] Fatal error', err);
  process.exit(1);
});
