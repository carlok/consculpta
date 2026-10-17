// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { clamp, gaussRnd, mulberry32, pick, round3, setRandom } from '../../../src/engine/rng.js';

describe('engine rng', () => {
  it('mulberry32 is deterministic and clamp/round3 behave', () => {
    const r = mulberry32(1);
    expect(r()).toBe(mulberry32(1)());
    setRandom(r);
    expect(pick([1, 2, 3])).toBeGreaterThanOrEqual(1);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(round3(1.23456)).toBe(1.235);
    expect(gaussRnd()).toBeTypeOf('number');
  });
});
