import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import process from 'node:process';

import axe from 'axe-core';

import type { AxeResults } from 'axe-core';

const INCLUDE_BEST =
  process.env.A11Y_INCLUDE_BEST_PRACTICES === '1' ||
  process.env.A11Y_INCLUDE_BEST_PRACTICES === 'true';
const WRITE_BEST_OUTPUT =
  process.env.A11Y_BEST_OUTPUT === '1' || process.env.A11Y_BEST_OUTPUT === 'true';
const BEST_OUTPUT_PATH =
  process.env.A11Y_BEST_OUTPUT_PATH || 'artifacts/axe-best-practices-violations.json';

let collectedBestViolations: AxeResults['violations'] = [];

export async function runAxe(
  node: HTMLElement,
  options: axe.RunOptions = {},
  opts?: { includeBestPractices?: boolean },
) {
  return new Promise<AxeResults>((resolvePromise, reject) => {
    const merged: axe.RunOptions = {
      rules: {
        'color-contrast': { enabled: true },
      },
      ...options,
    };
    if (opts?.includeBestPractices || INCLUDE_BEST) {
      merged.rules = {
        ...merged.rules,
        'heading-order': { enabled: true },
        region: { enabled: true },
      };
    }
    axe.run(node, merged, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      if (opts?.includeBestPractices || INCLUDE_BEST) {
        const subset = results.violations.filter(
          (v) => v.id === 'heading-order' || v.id === 'region',
        );
        if (subset.length) {
          collectedBestViolations.push(...subset);
        }
      }
      resolvePromise(results);
    });
  });
}

export function formatViolations(violations: AxeResults['violations']) {
  return violations
    .map(
      (v) =>
        `${v.id}: ${v.help} (impact: ${v.impact})\n  Nodes: ${v.nodes
          .map((n) => n.target.join(' '))
          .join(', ')}`,
    )
    .join('\n\n');
}
// Write collected violations once per process if requested
if (WRITE_BEST_OUTPUT) {
  process.once('exit', () => {
    if (!collectedBestViolations.length) return;
    try {
      const outPath = resolve(process.cwd(), BEST_OUTPUT_PATH);
      const dir = dirname(outPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const payload = {
        generatedAt: new Date().toISOString(),
        violations: collectedBestViolations,
      };
      writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log('[axeHelper] Wrote best-practice violations to', outPath);
    } catch (e) {
      console.warn('[axeHelper] Failed to write best-practice violations', e);
    }
  });
}
