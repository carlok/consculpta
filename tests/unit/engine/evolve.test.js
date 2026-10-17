// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  crossover,
  mutate,
  mutateParams,
  randomGenome,
  startGenome,
  treeOp,
} from '../../../src/engine/evolve.js';
import { cloneG, STRANDS_ON } from '../../../src/engine/genome.js';
import { parse } from '../../../src/engine/parse.js';
import { print } from '../../../src/engine/print.js';
import { mulberry32, setRandom } from '../../../src/engine/rng.js';

describe('engine evolve', () => {
  it('mutates trees and crosses over under a fixed rng', () => {
    setRandom(mulberry32(2026));
    const g = startGenome();
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const { g: h, label } = mutate(g, 0.65);
      seen.add(label);
      expect(print(h.t)).toBeTruthy();
      const c = crossover(g, h);
      if (c) expect(print(c.t)).not.toBe(print(g.t));
    }
    expect(seen.size).toBeGreaterThan(1);
    const t = parse('add(x, y)');
    mutateParams(t, 1);
    expect(treeOp(t, 'hoist', 1)).toBeTruthy();
    expect(treeOp(t, 'wrap', 1)).toBeTruthy();
    expect(treeOp(t, 'graft', 1)).toBeTruthy();
    expect(treeOp(t, 'swap', 1)).toBeTruthy();
    const g2 = cloneG(g);
    g2.v[24] = STRANDS_ON;
    mutate(g2, 0.9);
    for (const seed of [42, 7, 99, 2026]) {
      setRandom(mulberry32(seed));
      expect(print(randomGenome().t)).toBeTruthy();
    }
  });
});
