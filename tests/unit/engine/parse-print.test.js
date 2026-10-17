// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/engine/parse.js';
import { print } from '../../../src/engine/print.js';

describe('engine parse/print', () => {
  it('parses leaves and rejects unknown ops', () => {
    expect(print(parse('x'))).toBe('x');
    expect(() => parse('unknown(1)')).toThrow(/Unknown function/);
  });

  it('normalises numeric literals', () => {
    expect(print(parse('0.4'))).toBe('0.4');
    expect(print(parse('-0'))).toBe('0');
  });
});
