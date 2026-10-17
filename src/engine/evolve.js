// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { fitIso, viable } from './analysis.js';
import { cloneG, DISCRETE, NS, PALETTE, STRANDS_OFF, STRANDS_ON, val } from './genome.js';
import { BY_KIND, OPS } from './ops.js';
import { parse } from './parse.js';
import { print } from './print.js';
import { _rnd, clamp, gaussRnd, pick, round3 } from './rng.js';
import { clone, cost, grow, makeLeaf, nodes, randParams, size } from './tree.js';

const reflect = (x) => {
  x = Math.abs(x) % 2;
  return x > 1 ? 2 - x : x;
};
export function mutateParams(n, amt) {
  if (n.op === 'num') {
    n.v = clamp(round3(n.v + gaussRnd() * 0.35 * amt), -1.5, 1.5);
    return true;
  }
  const spec = OPS[n.op].p;
  if (!spec) return false;
  const j = Math.floor(_rnd() * spec.length);
  const [, lo, hi, int] = spec[j];
  if (int)
    n.p[j] = clamp(
      n.p[j] + (_rnd() < 0.5 ? -1 : 1) * (_rnd() < 0.7 ? 1 : Math.ceil(_rnd() * (hi - lo))),
      lo,
      hi,
    );
  else n.p[j] = round3(clamp(n.p[j] + gaussRnd() * (hi - lo) * 0.12 * amt, lo, hi));
  return true;
}
export function treeOp(root, kind, amt) {
  const list = nodes(root);
  const it = pick(list);
  const replace = (repl) => {
    if (!it.parent) return repl;
    it.parent.c[it.idx] = repl;
    return root;
  };
  const n = it.n;
  switch (kind) {
    case 'tweak': {
      const cands = list.filter((e) => e.n.op === 'num' || OPS[e.n.op].p);
      if (!cands.length) return treeOp(root, 'graft', amt);
      mutateParams(pick(cands).n, amt);
      return root;
    }
    case 'swap': {
      const k = OPS[n.op].kind;
      if (k === 'leaf') return replace(makeLeaf());
      const op = pick(BY_KIND[k].filter((o) => o !== n.op));
      const m = { op, c: n.c };
      const p = randParams(op);
      if (p.length) m.p = p;
      return replace(m);
    }
    case 'graft':
      return replace(grow(1 + Math.floor(_rnd() * 2)));
    case 'wrap': {
      if (_rnd() < 0.5) {
        const kind2 = _rnd() < 0.5 ? 'un' : 'sp';
        const op = pick(BY_KIND[kind2]);
        const m = { op, c: [n] };
        const p = randParams(op);
        if (p.length) m.p = p;
        return replace(m);
      }
      const op = pick(BY_KIND.bin);
      const other = grow(Math.floor(_rnd() * 2));
      const m = { op, c: _rnd() < 0.5 ? [n, other] : [other, n] };
      const p = randParams(op);
      if (p.length) m.p = p;
      return replace(m);
    }
    case 'hoist': {
      const inner = list.filter((e) => e.n.c?.length);
      if (!inner.length) return treeOp(root, 'tweak', amt);
      const e = pick(inner);
      const child = pick(e.n.c);
      if (!e.parent) return child;
      e.parent.c[e.idx] = child;
      return root;
    }
  }
  return root;
}
export function pickOp(sz) {
  const big = sz > 22;
  const w = big
    ? { tweak: 0.35, swap: 0.15, graft: 0.12, wrap: 0.06, hoist: 0.32 }
    : { tweak: 0.34, swap: 0.16, graft: 0.2, wrap: 0.2, hoist: 0.1 };
  let u = _rnd();
  for (const k in w) {
    u -= w[k];
    if (u < 0) return k;
  }
  return 'tweak';
}
export function mutateScalars(v, rate, strength = 1) {
  const p = (0.06 + rate * 0.3) * strength,
    sigma = 0.03 + rate * 0.16;
  for (let i = 0; i < NS; i++) {
    if (_rnd() < (DISCRETE.has(i) ? p * 0.3 : p)) v[i] = reflect(v[i] + gaussRnd() * sigma);
  }
}
export function mutate(g, rate) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const h = cloneG(g);
    const nOps = 1 + Math.floor(_rnd() * (1 + rate * 2.2));
    let label = '';
    for (let k = 0; k < nOps; k++) {
      if (_rnd() < 0.82) {
        const op = pickOp(size(h.t));
        h.t = treeOp(h.t, op, 0.5 + rate);
        if (!label) label = op;
      } else {
        const op = _rnd() < 0.6 ? 'tweak' : pickOp(size(h.c));
        h.c = treeOp(h.c, op, 0.5 + rate);
        if (!label) label = 'colour';
      }
    }
    mutateScalars(h.v, rate);
    if (_rnd() < 0.08) {
      h.v[24] = val(h.v, 24) ? STRANDS_OFF : STRANDS_ON;
      label = 'strands';
      if (!viable(h).ok) fitIso(h);
    }
    if (label !== 'strands' && print(h.t) === print(g.t) && print(h.c) === print(g.c)) continue;
    if (viable(h).ok) return { g: h, label };
  }
  const h = cloneG(g);
  mutateScalars(h.v, Math.max(rate, 0.5), 2);
  return { g: h, label: 'palette' };
}
export function crossover(a, b) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const h = cloneG(a);
    const donor = pick(nodes(b.t)).n;
    const list = nodes(h.t);
    const e = pick(list);
    if (!e.parent) h.t = clone(donor);
    else e.parent.c[e.idx] = clone(donor);
    if (_rnd() < 0.5) for (let i = PALETTE[0]; i <= PALETTE[1]; i++) h.v[i] = b.v[i];
    if (_rnd() < 0.3) h.c = clone(b.c);
    if (print(h.t) === print(a.t)) continue;
    if (viable(h).ok) return h;
  }
  return null;
}
export const BANK = [
  'warp(0.5, 0.6, 3, fbm(1, 2, 7))',
  'twist(1.4, add(sin(4, 0, x), noise(1.2, 9)))',
  'mirx(smin(0.25, gauss(5, sub(y, scale(0.5, noise(1, 2)))), noise(1.6, 8)))',
  'max(noise(1.3, 21), neg(abs(sin(3, 0.4, r))))',
  'rotz(0.6, mul(fbm(1.1, 3, 5), soft(scale(2, y))))',
  'warp(1.2, 0.3, 14, sub(abs(noise(0.9, 4)), 0.2))',
  'miry(twist(-2, min(sin(5, 0, x), noise(1.4, 31))))',
  'zoom(1.3, add(noise(1, 12), scale(0.6, sin(2.5, 1, add(x, z)))))',
];
export function randomScalars() {
  const v = Array.from({ length: NS }, () => _rnd());
  v[2] = _rnd() < 0.7 ? 0.1 : _rnd();
  v[6] = 0.45 + _rnd() * 0.55;
  v[24] = _rnd() < 0.15 ? STRANDS_ON : STRANDS_OFF;
  return v;
}
export function randomGenome() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const fromBank = _rnd() < 0.5;
    const g = {
      t: fromBank ? parse(pick(BANK)) : grow(3 + Math.floor(_rnd() * 2)),
      c: grow(Math.floor(_rnd() * 2)),
      v: randomScalars(),
    };
    if (cost(g.c) > 3) g.c = { op: 'noise', p: randParams('noise') };
    let h = g;
    if (fromBank) {
      const m = mutate(g, 0.4);
      h = m.g;
    }
    const vb = viable(h);
    if (vb.ok) return h;
    if (val(h.v, 24) === 1 && fitIso(h)) return h;
    // nudge iso toward a workable occupancy before giving up on this tree
    for (let k = 0; k < 6 && !viable(h).ok; k++) {
      h.v[0] = _rnd();
      h.v[2] = 0.1;
    }
    if (viable(h).ok) return h;
  }
  return startGenome();
}
export function startGenome() {
  return {
    t: parse('warp(0.5, 0.6, 3, fbm(1, 2, 7))'),
    c: parse('noise(0.9, 11)'),
    v: [
      0.6,
      0.2143,
      0.1667,
      0.4167,
      0.1667,
      0.6,
      0.8,
      0.5,
      0.5,
      0.5,
      0.825,
      0.675,
      0.625,
      0.5,
      0.5,
      0.5,
      0,
      0.15,
      0.2,
      0,
      0.7,
      0.583,
      0.6,
      0.1114,
      STRANDS_OFF,
    ],
  };
}
