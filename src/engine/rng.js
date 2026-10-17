// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { TAU } from './constants.js';

/** @type {() => number} */
let rnd = Math.random;

/** @param {() => number} f */
export function setRandom(f) {
  rnd = f;
}

/** @param {number} seed */
export function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussRnd() {
  let u = 0;
  let v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/** @template T @param {readonly T[]} a */
export function pick(a) {
  return a[Math.floor(rnd() * a.length)];
}

/** @param {number} x @param {number} a @param {number} b */
export function clamp(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

/** @param {number} x */
export function round3(x) {
  return Math.round(x * 1000) / 1000;
}

export function _rnd() {
  return rnd();
}
