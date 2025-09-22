import * as vitest from 'vitest';

import { add, isEven } from '../src/math';

const { describe, it, expect } = vitest;

describe('math', () => {
  it('adds numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('detects even numbers', () => {
    expect(isEven(4)).toBe(true);
    expect(isEven(5)).toBe(false);
  });
});
