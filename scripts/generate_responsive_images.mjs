#!/usr/bin/env node
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { Jimp } from 'jimp';

// Simple responsive image generator.
// Scans media/images (if exists) and produces multiple widths into public assets path.

const INPUT_DIR = join(process.cwd(), 'media');
const OUTPUT_DIR = join(process.cwd(), 'public_images');
const TARGET_WIDTHS = [320, 640, 960, 1280];

function collectImages(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files = files.concat(collectImages(full));
    else if (/\.(jpe?g|png|webp)$/i.test(entry)) files.push(full);
  }
  return files;
}

function ensureDir(p) {
  try {
    mkdirSync(p, { recursive: true });
  } catch {}
}

async function processOne(file) {
  const img = await Jimp.read(file);
  const base = basename(file, extname(file));
  for (const w of TARGET_WIDTHS) {
    if (img.bitmap.width < w) continue; // skip upscaling
    const clone = img.clone();
    clone.resize({ w });
    const outDir = join(OUTPUT_DIR, `${w}`);
    ensureDir(outDir);
    const outPath = join(outDir, `${base}.webp`);
    await clone.writeAsync(outPath);
    // Optionally could record metadata
  }
}

async function main() {
  ensureDir(OUTPUT_DIR);
  if (!statSync(INPUT_DIR, { throwIfNoEntry: false })) {
    console.warn('[images] No media directory found, skipping');
    return;
  }
  const list = collectImages(INPUT_DIR);
  for (const f of list) {
    try {
      await processOne(f);
      process.stdout.write('.');
    } catch (e) {
      console.warn(`\n[images] Failed ${f}:`, e.message);
    }
  }
  console.log(`\n[images] Done (${list.length} source images)`);
  // Emit a small manifest for consumption if needed
  const manifest = { widths: TARGET_WIDTHS };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
