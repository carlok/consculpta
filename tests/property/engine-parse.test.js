// SPDX-License-Identifier: Apache-2.0
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/engine/parse.js';
import { print } from '../../src/engine/print.js';

const LEAF = fc.constantFrom('x', 'y', 'z', 'r', '0.4');
const SIMPLE = fc.oneof(
  LEAF,
  fc
    .tuple(
      fc.constantFrom('noise', 'fbm'),
      fc.integer({ min: 0, max: 3 }),
      fc.integer({ min: 0, max: 9 }),
    )
    .map(([op, a, b]) => (op === 'noise' ? `noise(${a}.${b}, ${b})` : `fbm(${a}.${b}, 2, ${b})`)),
);

describe('engine parse/print properties', () => {
  it('parse(print(tree)) is identity for printed trees', () => {
    fc.assert(
      fc.property(SIMPLE, (src) => {
        const printed = print(parse(src));
        expect(print(parse(printed))).toBe(printed);
      }),
      { numRuns: 80 },
    );
  });
});
