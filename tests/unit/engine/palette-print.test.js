// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { startGenome } from '../../../src/engine/evolve.js';
import { paletteToGenes } from '../../../src/engine/palette.js';
import { parse } from '../../../src/engine/parse.js';
import { pretty, print } from '../../../src/engine/print.js';

describe('engine palette and pretty print', () => {
  it('formats nested trees and partial palette maps', () => {
    const deep = parse(
      'add(warp(0.5, 0.6, 3, fbm(1, 2, 7)), twist(1.4, add(sin(4, 0, x), noise(1.2, 9))))',
    );
    expect(pretty(deep)).toContain('\n');
    expect(print(deep)).toBeTruthy();
    const v = startGenome().v.slice();
    paletteToGenes(null, v);
    paletteToGenes({ a: [0.5, 0.5] }, v);
    paletteToGenes({ b: [0.2, 0.3, 0.4, 5] }, v);
  });
});
