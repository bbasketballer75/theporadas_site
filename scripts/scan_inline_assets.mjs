#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
let inlineScripts = 0;
let inlineStyles = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.html?$/i.test(entry)) inspect(full);
  }
}

function inspect(file) {
  const html = readFileSync(file, 'utf8');
  const scripts = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const styles = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  if (scripts.length || styles.length) {
    console.log(`FILE: ${file}`);
    if (scripts.length) {
      scripts.forEach((b, i) => {
        inlineScripts++;
        const snippet = b.split('\n').slice(0, 3).join('\n');
        console.log(`  [script ${i + 1}] lines=${b.split('\n').length} preview=\n${snippet}`);
      });
    }
    if (styles.length) {
      styles.forEach((b, i) => {
        inlineStyles++;
        const snippet = b.split('\n').slice(0, 3).join('\n');
        console.log(`  [style ${i + 1}] lines=${b.split('\n').length} preview=\n${snippet}`);
      });
    }
  }
}

try {
  walk(distDir);
  console.log(`SUMMARY inlineScripts=${inlineScripts} inlineStyles=${inlineStyles}`);
  if (process.env.FAIL_ON_INLINE === '1' && (inlineScripts || inlineStyles)) {
    console.error('Inline assets present; failing as requested.');
    process.exit(1);
  }
} catch (e) {
  console.error('Scan error', e);
  process.exit(2);
}
