// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { BY_KIND, NCHILD, OPS } from './ops.js';
import { _rnd, pick, round3 } from './rng.js';

export const clone = (n) => JSON.parse(JSON.stringify(n));
export function nodes(root) {
  const out = [];
  (function walk(n, parent, idx, depth) {
    out.push({ n, parent, idx, depth });
    for (let i = 0; i < (n.c || []).length; i++) walk(n.c[i], n, i, depth + 1);
  })(root, null, 0, 0);
  return out;
}
export function depth(n) {
  return 1 + Math.max(0, ...(n.c || []).map(depth));
}
export function cost(n) {
  let c = 0;
  if (n.op === 'noise') c = 1;
  else if (n.op === 'fbm') c = n.p[1];
  else if (n.op === 'warp') c = 3;
  return c + (n.c || []).reduce((a, k) => a + cost(k), 0);
}
export function size(n) {
  return 1 + (n.c || []).reduce((a, k) => a + size(k), 0);
}
export function randParams(op) {
  return (OPS[op].p || []).map(([, lo, hi, int]) =>
    int ? Math.floor(lo + _rnd() * (hi - lo + 1)) : round3(lo + _rnd() * (hi - lo)),
  );
}
export function makeLeaf() {
  const u = _rnd();
  if (u < 0.3) return { op: 'noise', p: randParams('noise') };
  if (u < 0.4)
    return {
      op: 'fbm',
      p: [round3(0.4 + _rnd() * 1.6), 2 + Math.floor(_rnd() * 2), Math.floor(_rnd() * 1000)],
    };
  if (u < 0.7) return { op: pick(['x', 'y', 'z']) };
  if (u < 0.85) return { op: 'r' };
  return { op: 'num', v: round3(-0.8 + _rnd() * 1.6) };
}
export function grow(d) {
  if (d <= 0 || _rnd() < 0.28) return makeLeaf();
  const u = _rnd();
  const kind = u < 0.32 ? 'un' : u < 0.72 ? 'bin' : 'sp';
  const op = pick(BY_KIND[kind]);
  const n = { op, p: randParams(op), c: [] };
  for (let i = 0; i < NCHILD[kind]; i++) n.c.push(grow(d - 1));
  if (!n.p.length) delete n.p;
  return n;
}
