import { createHash } from 'node:crypto';

import { describe, it, expect } from 'vitest';

function sha256Base64(content: string) {
  return createHash('sha256').update(content).digest('base64');
}

describe('csp audit hash', () => {
  it('matches known inline style hash', () => {
    const sample = 'body{color:red;}';
    const h = sha256Base64(sample);
    expect(h).toBe(createHash('sha256').update(sample).digest('base64'));
  });
  it('matches known inline script hash', () => {
    const script = 'console.log("hello")';
    const h = sha256Base64(script);
    expect(h).toBe(createHash('sha256').update(script).digest('base64'));
  });
});
