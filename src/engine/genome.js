// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { TAU } from './constants.js';
import { parse } from './parse.js';
import { print } from './print.js';
import { clamp } from './rng.js';

export const lin = (a, b) => (g) => a + g * (b - a);
export const SCALARS = [
  { n: 'Iso level', f: lin(-0.25, 0.25) },
  { n: 'Thickness', f: lin(0.02, 0.16), dp: 3 },
  { n: 'Surface', f: (g) => Math.floor(g * 2.999), names: ['solid', 'shell', 'contours'] },
  { n: 'Contours', f: (g) => 2 + Math.floor(g * 5.999), int: 1 },
  { n: 'Block', f: (g) => Math.floor(g * 2.999), names: ['sphere', 'cube', 'drum'] },
  { n: 'Block size', f: lin(0.85, 1.1) },
  { n: 'Edge fade', f: lin(0, 1) },
  { n: 'a red', f: lin(0.3, 0.7) },
  { n: 'a green', f: lin(0.3, 0.7) },
  { n: 'a blue', f: lin(0.3, 0.7) },
  { n: 'b red', f: lin(0.15, 0.55) },
  { n: 'b green', f: lin(0.15, 0.55) },
  { n: 'b blue', f: lin(0.15, 0.55) },
  { n: 'c red', f: lin(0.3, 1.7) },
  { n: 'c green', f: lin(0.3, 1.7) },
  { n: 'c blue', f: lin(0.3, 1.7) },
  { n: 'd red', f: lin(0, 1) },
  { n: 'd green', f: lin(0, 1) },
  { n: 'd blue', f: lin(0, 1) },
  { n: 'Hue shift', f: lin(0, 1) },
  { n: 'Formula vs depth', f: lin(0, 1) },
  { n: 'Colour spread', f: lin(0.2, 1.4) },
  { n: 'Gloss', f: lin(0, 1) },
  { n: 'Light angle', f: (g) => g * TAU, deg: 1 },
  { n: 'Strands', f: (g) => (g >= 0.75 ? 1 : 0), names: ['off', 'on'] },
];
export const NS = SCALARS.length;
export const DISCRETE = new Set([2, 3, 4, 24]);
export const STRANDS_ON = 0.86;
export const STRANDS_OFF = 0.25;
export const PALETTE = [7, 18];
/** @param {number[]} v @param {number} i */
export const val = (v, i) => SCALARS[i].f(v[i]);
/** @param {number} i @param {number[]} g */
export function fmtScalar(i, g) {
  const d = SCALARS[i],
    v = d.f(g);
  if (d.names) return d.names[v];
  if (d.int) return String(v);
  if (d.deg) return Math.round((v * 180) / Math.PI) + '°';
  return v.toFixed(d.dp || 2);
}

export function encode(g) {
  const json = JSON.stringify({
    f: print(g.t),
    c: print(g.c),
    v: g.v
      .map((x) =>
        Math.round(clamp(x, 0, 1) * 4095)
          .toString(16)
          .padStart(3, '0'),
      )
      .join(''),
  });
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return 'nsb3.' + b64;
}
export function decode(s) {
  const m = /^nsb3\.([A-Za-z0-9_-]+)$/.exec(String(s || '').trim());
  if (!m) return null;
  try {
    let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    const o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!/^[0-9a-f]+$/i.test(o.v) || o.v.length % 3 || o.v.length > NS * 3 || o.v.length < 24 * 3)
      return null;
    const v = [];
    for (let i = 0; i < o.v.length / 3; i++) v.push(parseInt(o.v.substr(i * 3, 3), 16) / 4095);
    while (v.length < NS) v.push(STRANDS_OFF);
    return { t: parse(o.f), c: parse(o.c), v };
  } catch (_e) {
    return null;
  }
}
export function tag(g) {
  const s = encode(g);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-4);
}
/** @param {import('./types.js').Genome} g */
export function cloneG(g) {
  return { t: JSON.parse(JSON.stringify(g.t)), c: JSON.parse(JSON.stringify(g.c)), v: g.v.slice() };
}
