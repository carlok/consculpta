// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { snoise } from '../../../src/engine/noise.js';

/** @type {[number, number, number, number][]} */
const GOLDEN = [
  [0, 0, 0, -0.43587301769870523],
  [1, 2, 3, 0.22423833734156526],
  [0.1, 0.2, 0.3, -0.4613945798004206],
  [-1.5, 2.7, -0.3, -0.5468441845181574],
];

describe('engine noise', () => {
  it('matches GPU-aligned samples with Math.fround lattice scale', () => {
    for (const [x, y, z, expected] of GOLDEN) {
      expect(snoise(x, y, z)).toBeCloseTo(expected, 12);
    }
  });

  it('regression: Math.fround on the lattice constant matches GPU float32', () => {
    expect(Math.fround(0.142857142857)).not.toBe(0.142857142857);
    const [x, y, z, expected] = GOLDEN[1];
    expect(snoise(x, y, z)).toBeCloseTo(expected, 12);
    expect(snoise(x, y, z, false)).not.toBe(snoise(x, y, z));
  });
});
