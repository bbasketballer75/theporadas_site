// @vitest-environment node
import process from 'node:process';

import { describe, expect, it } from 'vitest';

describe('Node.js environment test', () => {
  it('should run in Node.js environment', () => {
    expect(process.version).toBeDefined();
    expect(typeof require).toBe('function');
  });
});
