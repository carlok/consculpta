// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { fitIso, occupancy, sdBlock, stats, viable } from '../../../src/engine/analysis.js';
import { startGenome } from '../../../src/engine/evolve.js';
import { cloneG, val } from '../../../src/engine/genome.js';
import { parse } from '../../../src/engine/parse.js';
import { mulberry32, setRandom } from '../../../src/engine/rng.js';

describe('engine analysis', () => {
  it('scores block SDFs and adjusts iso for strands', () => {
    setRandom(mulberry32(3));
    expect(sdBlock(0, 0, 0, 0, 1)).toBeLessThan(0);
    expect(sdBlock(0, 0, 0, 1, 1)).toBeTypeOf('number');
    expect(sdBlock(0, 0, 0, 2, 1)).toBeTypeOf('number');
    const g = startGenome();
    const st = stats(g);
    expect(st.ok).toBe(true);
    expect(occupancy(g, st)).toBeGreaterThan(0);
    const g2 = cloneG(g);
    g2.v[2] = 0.5;
    g2.v[3] = 0.5;
    viable(g2);
    const g3 = cloneG(g);
    g3.v[24] = 1;
    g3.v[0] = 0.9;
    fitIso(g3);
    expect(val(g3.v, 24)).toBe(1);
    const g4 = cloneG(g);
    g4.v[2] = 0;
    g4.v[0] = 0.99;
    expect(typeof fitIso(g4)).toBe('boolean');
    const g5 = cloneG(g);
    g5.v[2] = 0.5;
    g5.v[0] = 0.01;
    expect(typeof viable(g5).ok).toBe('boolean');
    const big = cloneG(g);
    big.t = parse('warp(1.2, 0.3, 14, sub(abs(noise(0.9, 4)), 0.2))');
    expect(viable(big).ok).toBe(true);
  });
});
