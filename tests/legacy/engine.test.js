// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import E from '../helpers/legacy-engine.mjs';

const ROUNDTRIP_FORMULAS = [
  'warp(0.5, 0.6, 3, fbm(1, 2, 7))',
  'twist(1.4, add(sin(4, 0, x), noise(1.2, 9)))',
  'mirx(smin(0.25, gauss(5, sub(y, scale(0.5, noise(1, 2)))), noise(1.6, 8)))',
  'x',
  'add(noise(1, 2), sin(2, 0, y))',
  '0.4',
];

/** @type {[number, number, number, number][]} */
const NOISE_SAMPLES = [
  [0, 0, 0, -0.43587301769870523],
  [1, 2, 3, 0.22423833734156526],
  [0.1, 0.2, 0.3, -0.4613945798004206],
  [-1.5, 2.7, -0.3, -0.5468441845181574],
];

const LEGACY_24_GENE_CODE =
  'nsb3.eyJmIjoid2FycCgwLjUsIDAuNiwgMywgZmJtKDEsIDIsIDcpKSIsImMiOiJub2lzZSgwLjksIDExKSIsInYiOiI5OTkzNmUyYWI2YWEyYWI5OTljY2M4MDA4MDA4MDBkMzJhY2M5ZmY4MDA4MDA4MDAwMDAyNjYzMzMwMDBiMzM5NTM5OTkxYzgifQ';

describe('legacy engine characterization', () => {
  it('parse/print round-trips canonical formulas', () => {
    for (const src of ROUNDTRIP_FORMULAS) {
      const tree = E.parse(src);
      const printed = E.print(tree);
      expect(E.print(E.parse(printed))).toBe(printed);
    }
  });

  it('encodes and decodes a full 25-gene genome code', () => {
    const g = E.startGenome();
    const code = E.encode(g);
    expect(code.startsWith('nsb3.')).toBe(true);
    const back = E.decode(code);
    expect(back).not.toBeNull();
    expect(E.print(back.t)).toBe(E.print(g.t));
    expect(E.print(back.c)).toBe(E.print(g.c));
    expect(back.v.length).toBe(E.NS);
    expect(back.v.map((x, i) => Math.abs(x - g.v[i]) < 1 / 4096)).not.toContain(false);
  });

  it('decodes a legacy 24-gene code and pads the strands gene', () => {
    const back = E.decode(LEGACY_24_GENE_CODE);
    expect(back).not.toBeNull();
    expect(back.v.length).toBe(25);
    expect(back.v[24]).toBeCloseTo(0.25, 5);
    expect(E.print(back.t)).toBe('warp(0.5, 0.6, 3, fbm(1, 2, 7))');
    expect(E.print(back.c)).toBe('noise(0.9, 11)');
  });

  it('matches simplex noise at fixed points (Math.fround constant)', () => {
    for (const [x, y, z, expected] of NOISE_SAMPLES) {
      expect(E.snoise(x, y, z)).toBeCloseTo(expected, 12);
    }
  });

  it('rejects a constant shape formula as non-viable', () => {
    const g = E.startGenome();
    g.t = E.parse('0.4');
    expect(E.viable(g)).toEqual({ ok: false, why: 'flat' });
  });

  it('accepts the default start genome as viable', () => {
    const g = E.startGenome();
    const v = E.viable(g);
    expect(v.ok).toBe(true);
    expect(v.why).toBe('');
    expect(v.occ).toBeCloseTo(0.14615384615384616, 10);
  });

  it('accepts a simple coordinate field with default genes', () => {
    const g = E.startGenome();
    g.t = E.parse('x');
    const v = E.viable(g);
    expect(v.ok).toBe(true);
    expect(v.occ).toBeCloseTo(0.1346153846153846, 10);
  });
});
