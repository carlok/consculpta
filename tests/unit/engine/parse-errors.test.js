// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { decode } from '../../../src/engine/genome.js';
import { parse } from '../../../src/engine/parse.js';

describe('engine parse/decode errors', () => {
  it('rejects malformed input', () => {
    expect(() => parse('foo(')).toThrow();
    expect(() => parse('sin(1)')).toThrow();
    expect(decode('not-a-code')).toBeNull();
    expect(decode('nsb3.!!!')).toBeNull();
  });
});
