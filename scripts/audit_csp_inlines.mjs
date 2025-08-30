#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Simple CSP inline auditor: scans dist/index.html for <style>...</style> and <script>...</script> blocks (non-module & module)
// and computes SHA256 hashes (base64) of their contents.
// Usage: node scripts/audit_csp_inlines.mjs [--apply]
// If --apply is provided, will write a file artifacts/csp_hashes.json and emit suggested policy fragments.

function sha256Base64(content) {
  return createHash('sha256').update(content).digest('base64');
}

function extractBlocks(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const blocks = [];
  let m;
  while ((m = regex.exec(html))) {
    blocks.push(m[1]);
  }
  return blocks;
}

function main() {
  const distIndex = join(process.cwd(), 'dist', 'index.html');
  let html;
  try {
    html = readFileSync(distIndex, 'utf8');
  } catch {
    console.error('[csp:audit] Cannot read dist/index.html. Build first.');
    process.exit(1);
  }
  const styles = extractBlocks(html, 'style');
  const scripts = extractBlocks(html, 'script');
  if (!styles.length) {
    console.log('[csp:audit] No inline <style> blocks found.');
  } else {
    console.log(`[csp:audit] Found ${styles.length} inline <style> block(s).`);
  }
  if (!scripts.length) {
    console.log('[csp:audit] No inline <script> blocks found.');
  } else {
    console.log(`[csp:audit] Found ${scripts.length} inline <script> block(s).`);
  }
  const styleHashes = styles.map((s) => 'sha256-' + sha256Base64(s));
  const scriptHashes = scripts.map((s) => 'sha256-' + sha256Base64(s));
  styleHashes.forEach((h, i) => console.log(` style-hash[${i}]: ${h}`));
  scriptHashes.forEach((h, i) => console.log(` script-hash[${i}]: ${h}`));

  const apply = process.argv.includes('--apply');
  if (apply) {
    const outPath = join(process.cwd(), 'artifacts', 'csp_hashes.json');
    const payload = { style: styleHashes, script: scriptHashes };
    writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log('[csp:audit] Wrote hash manifest to', outPath);
    if (styleHashes.length) {
      console.log('\nSuggested style-src directive:');
      console.log("style-src 'self' " + styleHashes.join(' '));
    }
    if (scriptHashes.length) {
      console.log('\nSuggested script-src directive additions:');
      console.log(scriptHashes.join(' '));
    }
    if (!scriptHashes.length && !styles.length) {
      console.log('\nNo inline blocks detected. You can omit unsafe-inline for style and script.');
    }
  }
}

main();
