// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { glsl } from '../../../src/engine/codegen-glsl.js';
import { js } from '../../../src/engine/evaluate.js';
import { BANK } from '../../../src/engine/evolve.js';
import { parse } from '../../../src/engine/parse.js';
import { mulberry32, setRandom } from '../../../src/engine/rng.js';

describe('engine formula bank', () => {
  it('evaluates and codegen every seed formula', () => {
    setRandom(mulberry32(7));
    for (const src of BANK) {
      const tree = parse(src);
      const fn = js(tree);
      const v = fn(0.12, -0.34, 0.56);
      expect(Number.isFinite(v)).toBe(true);
      const code = glsl(tree, 'f');
      expect(code).toContain('return v');
    }
  });
});
