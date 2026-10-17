// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { TAU } from './constants.js';
import { val } from './genome.js';
import { clamp } from './rng.js';

export function palCSS(v) {
  const stops = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const c = [0, 1, 2].map((j) =>
      clamp(
        val(v, 7 + j) + val(v, 10 + j) * Math.cos(TAU * (val(v, 13 + j) * t + val(v, 16 + j))),
        0,
        1,
      ),
    );
    stops.push(`rgb(${c.map((x) => Math.round(x * 255)).join(',')}) ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** @param {Record<string, number[]> | null | undefined} p @param {number[]} v */
export function paletteToGenes(p, v) {
  const rows = [
    ['a', 7, 0.3, 0.7],
    ['b', 10, 0.15, 0.55],
    ['c', 13, 0.3, 1.7],
    ['d', 16, 0, 1],
  ];
  for (const [k, base, lo, hi] of rows) {
    const arr = p?.[k];
    if (!Array.isArray(arr) || arr.length !== 3) continue;
    arr.forEach((x, j) => {
      const n = Number(x);
      if (Number.isFinite(n)) v[base + j] = clamp((clamp(n, lo, hi) - lo) / (hi - lo), 0, 1);
    });
  }
}
