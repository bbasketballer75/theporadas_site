import { describe, it, expect } from 'vitest';

import { diffCategories, diffAudits, diffMetrics, toMarkdown } from '../scripts/lhci_diff.mjs';

describe('lhci_diff helpers', () => {
  it('diffCategories detects changes', () => {
    const prev = { performance: 0.9, accessibility: 1 };
    const curr = { performance: 0.92, accessibility: 1, seo: 0.85 };
    const rows = diffCategories(prev, curr);
    expect(rows.find((r) => r.category === 'performance')?.delta).toBeCloseTo(0.02, 3);
    expect(rows.find((r) => r.category === 'seo')).toBeTruthy();
    expect(rows.find((r) => r.category === 'accessibility')).toBeFalsy();
  });

  it('diffAudits reports added/removed/changed', () => {
    const prev = { a: { score: 0.9, numericValue: 100 }, b: { score: 0.5, numericValue: 200 } };
    const curr = { b: { score: 1, numericValue: 200 }, c: { score: 0.4, numericValue: 300 } };
    const diff = diffAudits(prev, curr);
    expect(diff.removed.map((a) => a.id)).toContain('a');
    expect(diff.added.map((a) => a.id)).toContain('c');
    expect(diff.changed.map((a) => a.id)).toContain('b');
  });

  it('diffMetrics detects numeric and score deltas', () => {
    const prev = { LCP: { numericValue: 2500, score: 0.9 }, CLS: { numericValue: 0.05, score: 1 } };
    const curr = {
      LCP: { numericValue: 2700, score: 0.88 },
      CLS: { numericValue: 0.05, score: 1 },
      FCP: { numericValue: 800, score: 0.99 },
    };
    const rows = diffMetrics(prev, curr);
    const lcp = rows.find((r) => r.metric === 'LCP');
    expect(lcp?.delta).toBe(200);
    expect(lcp?.scoreDelta).toBe(-0.02);
    expect(rows.find((r) => r.metric === 'FCP')).toBeTruthy();
    expect(rows.find((r) => r.metric === 'CLS')).toBeFalsy();
  });

  it('toMarkdown includes sections with details blocks', () => {
    const catDiff = [{ category: 'performance', previous: 0.9, current: 0.95, delta: 0.05 }];
    const auditDiff = { added: [], removed: [], changed: [] };
    const metricsDiff = [
      { metric: 'LCP', previous: 2500, current: 2600, delta: 100, scoreDelta: -0.01 },
    ];
    const prev = { schemaVersion: 1 };
    const curr = { schemaVersion: 2 };
    const md = toMarkdown({ catDiff, auditDiff, metricsDiff, prev, curr });
    expect(md).toMatch(/Schema changed/);
    expect(md).toMatch(/Category Score Changes/);
    expect(md).toMatch(/Key Metrics/);
  });
});
