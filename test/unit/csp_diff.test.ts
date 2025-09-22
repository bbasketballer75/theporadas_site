/* eslint-env node */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

describe('CSP diff guard', () => {
  const root = process.cwd();
  const script = path.join(root, 'scripts', 'verify_csp_diff.mjs');
  it('accepts current CSP (no loosening)', () => {
    const out = execSync(`node ${script}`, { encoding: 'utf8' });
    expect(out).toMatch(/passes baseline/);
  });
  it('detects removal of directive', () => {
    const vercelPath = path.join(root, 'vercel.json');
    const original = fs.readFileSync(vercelPath, 'utf8');
    try {
      const mutated = original.replace('object-src', 'object-src-removed');
      fs.writeFileSync(vercelPath, mutated, 'utf8');
      let failed = false;
      try {
        execSync(`node ${script}`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (e: unknown) {
        failed = true;
        const err = e as { stdout?: string; stderr?: string };
        const output = (err.stdout || '') + (err.stderr || '');
        expect(output).toMatch(/Removed directive/);
      }
      expect(failed).toBe(true);
    } finally {
      fs.writeFileSync(vercelPath, original, 'utf8');
    }
  });
});
