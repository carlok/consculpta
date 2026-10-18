// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { occupancy } from '../../../src/engine/analysis.js';
import { defaultSpecimenGenome, fieldFn, js, parse, stats } from '../../../src/engine/index.js';

const PTS = [
  [0.1, 0.2, -0.3],
  [-0.4, 0.05, 0.25],
  [0.33, -0.21, 0.12],
];

describe('engine/evaluate morph offset', () => {
  it('a missing or zero morph argument gives the static field', () => {
    const F = js(parse('warp(1.2, 0.4, 7, add(noise(1.3, 4), fbm(0.9, 3, 11)))'));
    for (const [x, y, z] of PTS) {
      expect(F(x, y, z, 0)).toBe(F(x, y, z));
    }
  });

  it('morph shifts noise lookups along z, like gMT3 in the shaders', async () => {
    const { snoise, seedVec } = await import('../../../src/engine/noise.js');
    const F = js(parse('noise(1.5, 3)'));
    const [sx, sy, sz] = seedVec(3);
    const [x, y, z] = PTS[0];
    expect(F(x, y, z, 0.25)).toBeCloseTo(
      snoise(x * 1.5 + sx, y * 1.5 + sy, z * 1.5 + sz + 0.25),
      12,
    );
    expect(F(x, y, z, 0.25)).not.toBe(F(x, y, z));
  });

  it('formulas without noise ignore morph', () => {
    const F = js(parse('twist(1.1, mirx(sub(x, mul(y, z))))'));
    for (const [x, y, z] of PTS) expect(F(x, y, z, 0.7)).toBe(F(x, y, z));
  });
});

describe('engine/analysis fieldFn', () => {
  it('the default specimen has points inside and outside, and nothing past the block', () => {
    const g = defaultSpecimenGenome();
    const f = fieldFn(g);
    let inside = 0,
      total = 0;
    for (let i = 0; i < 400; i++) {
      const a = i * 2.399,
        r = 0.9 * Math.sqrt((i + 0.5) / 400);
      const y = ((i % 20) / 20 - 0.5) * 1.4;
      if (f(r * Math.cos(a), y, r * Math.sin(a)) > 0) inside++;
      total++;
    }
    expect(inside).toBeGreaterThan(0);
    expect(inside).toBeLessThan(total);
    expect(f(3, 0, 0)).toBe(-Infinity);
  });

  it('agrees with the occupancy estimate within sampling noise', () => {
    const g = defaultSpecimenGenome();
    const occ = occupancy(g, stats(g));
    const f = fieldFn(g);
    // Same rejection sampling as stats(): uniform points in the block.
    let s = 1,
      inside = 0,
      n = 0;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    while (n < 3000) {
      const x = (rnd() * 2 - 1) * 1.2,
        y = (rnd() * 2 - 1) * 1.2,
        z = (rnd() * 2 - 1) * 1.2;
      const v = f(x, y, z);
      if (v === -Infinity) continue;
      n++;
      if (v > 0) inside++;
    }
    expect(Math.abs(inside / n - occ)).toBeLessThan(0.08);
  });

  it('covers shell, contour and strand modes', () => {
    const base = defaultSpecimenGenome();
    for (const [gene, value] of [
      [2, 0.5],
      [2, 0.9],
      [24, 0.86],
      [4, 0.5],
      [4, 0.9],
    ]) {
      const g = { ...base, v: base.v.slice() };
      g.v[gene] = value;
      const f = fieldFn(g);
      const v = f(0.2, 0.1, -0.15, 0.3);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
