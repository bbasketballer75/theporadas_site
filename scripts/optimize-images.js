// scripts/optimize-images.js
// Generate responsive image sizes and WebP variants for site images using sharp.
// Usage: node scripts/optimize-images.js --input assets/public/media/photos --output assets/public/media/optimized

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const widths = [320, 640, 1200];
const exts = ['.jpg', '.jpeg', '.png'];

async function walk(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await walk(resolved));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) files.push(resolved);
    }
  }
  return files;
}

function usageAndExit() {
  console.log('Usage: node scripts/optimize-images.js --input <path> --output <path>');
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const inputIdx = argv.indexOf('--input');
  const outputIdx = argv.indexOf('--output');
  if (inputIdx === -1 || outputIdx === -1) usageAndExit();
  const inputDir = argv[inputIdx + 1];
  const outputDir = argv[outputIdx + 1];
  if (!inputDir || !outputDir) usageAndExit();

  try {
    const files = await walk(inputDir);
    console.log(`Found ${files.length} image(s) in ${inputDir}`);
    for (const file of files) {
      const rel = path.relative(inputDir, file);
      const parsed = path.parse(rel);
      const outBaseDir = path.join(outputDir, parsed.dir);
      await fs.mkdir(outBaseDir, { recursive: true });

      const inputBuffer = await fs.readFile(file);
      for (const w of widths) {
        const outName = `${parsed.name}-${w}.jpg`;
        const outPath = path.join(outBaseDir, outName);
        await sharp(inputBuffer).resize({ width: w }).jpeg({ quality: 80 }).toFile(outPath);
      }

      // Write a WebP of original size (optimized)
      const webpName = `${parsed.name}.webp`;
      const webpPath = path.join(outBaseDir, webpName);
      await sharp(inputBuffer).webp({ quality: 80 }).toFile(webpPath);

      console.log(`Optimized ${rel}`);
    }
    console.log('Image optimization complete.');
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
}

main();
