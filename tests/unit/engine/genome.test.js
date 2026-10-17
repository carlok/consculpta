// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { decode, encode, NS, startGenome, tag } from '../../../src/engine/index.js';

describe('engine genome', () => {
  it('encodes stable tags and round-trips genes', () => {
    const g = startGenome();
    const code = encode(g);
    expect(tag(g)).toMatch(/^[0-9A-F]{4}$/);
    const back = decode(code);
    expect(back?.v.length).toBe(NS);
    expect(back?.v.every((x, i) => Math.abs(x - g.v[i]) < 1 / 4096)).toBe(true);
  });
});
