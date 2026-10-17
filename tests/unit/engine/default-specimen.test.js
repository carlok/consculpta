// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPECIMEN_CODE,
  DEFAULT_SPECIMEN_COLOUR,
  DEFAULT_SPECIMEN_EXPORT_LABEL,
  DEFAULT_SPECIMEN_P,
  DEFAULT_SPECIMEN_SHAPE,
  DEFAULT_SPECIMEN_TAG,
  defaultSpecimenGenome,
} from '../../../src/engine/default-specimen.js';
import { print, tag, uniforms } from '../../../src/engine/index.js';

describe('default specimen 39E1', () => {
  it('decodes the pinned nsb3 code', () => {
    const g = defaultSpecimenGenome();
    expect(print(g.t)).toBe(DEFAULT_SPECIMEN_SHAPE);
    expect(print(g.c)).toBe(DEFAULT_SPECIMEN_COLOUR);
    expect(tag(g)).toBe(DEFAULT_SPECIMEN_TAG);
    expect(DEFAULT_SPECIMEN_TAG).not.toBe(DEFAULT_SPECIMEN_EXPORT_LABEL);
    expect(DEFAULT_SPECIMEN_EXPORT_LABEL).toBe('39E1');
    expect(DEFAULT_SPECIMEN_CODE.startsWith('nsb3.')).toBe(true);
  });

  it('uniforms match the maintainer shader export (analysis GRAD within tolerance)', () => {
    const u = uniforms(defaultSpecimenGenome());
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 4; col++) {
        const i = row * 4 + col;
        const exp = DEFAULT_SPECIMEN_P[row][col];
        const tol = row === 6 && col === 2 ? 0.01 : 0.0005;
        expect(Math.abs(u[i] - exp)).toBeLessThanOrEqual(tol);
      }
    }
  });
});
