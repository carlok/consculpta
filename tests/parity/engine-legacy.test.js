// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import modular from '../helpers/engine.mjs';
import legacy from '../helpers/legacy-engine.mjs';

const FORMULAS = ['warp(0.5, 0.6, 3, fbm(1, 2, 7))', 'add(noise(1, 2), sin(2, 0, y))', 'x'];

describe('modular engine vs legacy snapshot', () => {
  it('matches parse/print and noise on pinned formulas', () => {
    for (const src of FORMULAS) {
      expect(modular.print(modular.parse(src))).toBe(legacy.print(legacy.parse(src)));
    }
    expect(modular.snoise(0, 0, 0)).toBeCloseTo(legacy.snoise(0, 0, 0), 12);
    const pinned = modular.decode(modular.DEFAULT_SPECIMEN_CODE);
    expect(pinned).not.toBeNull();
    expect(modular.viable(pinned)).toEqual(legacy.viable(pinned));
  });
});
